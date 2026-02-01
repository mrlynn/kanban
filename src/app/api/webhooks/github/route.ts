import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Task, Board } from '@/types/kanban';
import { Project, ExternalLink, AutomationRule, GitHubWebhookPayload } from '@/types/integrations';
import { logActivity } from '@/lib/activity';
import crypto from 'crypto';

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Verify GitHub webhook signature
 */
function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  
  const expected = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')}`;
  
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Extract task references from text (e.g., "task_abc123" or "[TASK-123]")
 */
function extractTaskRefs(text: string): string[] {
  const refs: string[] = [];
  
  // Match task_xxx format
  const taskIdPattern = /\btask_[a-f0-9]{16}\b/gi;
  const taskMatches = text.match(taskIdPattern);
  if (taskMatches) refs.push(...taskMatches);
  
  // Match [MOLTBOARD-xxx] or [MB-xxx] format
  const bracketPattern = /\[(?:MOLTBOARD|MB)-(\d+)\]/gi;
  let match;
  while ((match = bracketPattern.exec(text)) !== null) {
    refs.push(`mb_${match[1]}`);
  }
  
  return Array.from(new Set(refs)); // Dedupe
}

/**
 * Find tasks by reference
 */
async function findTasksByRefs(
  db: ReturnType<typeof getDb> extends Promise<infer T> ? T : never,
  tenantId: string,
  refs: string[]
): Promise<Task[]> {
  if (refs.length === 0) return [];
  
  const tasks = await db
    .collection<Task>('tasks')
    .find({
      tenantId,
      $or: refs.map((ref) => {
        if (ref.startsWith('task_')) {
          return { id: ref };
        }
        // For mb_xxx format, search by order number
        if (ref.startsWith('mb_')) {
          const order = parseInt(ref.replace('mb_', ''), 10);
          return { order };
        }
        return { id: ref };
      }),
    })
    .toArray();
  
  return tasks;
}

/**
 * POST /api/webhooks/github
 * 
 * Receives GitHub webhook events
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');
    const deliveryId = request.headers.get('x-github-delivery');
    
    console.log(`[GitHub Webhook] Event: ${event}, Delivery: ${deliveryId}`);
    
    if (!event) {
      return NextResponse.json({ error: 'Missing event header' }, { status: 400 });
    }
    
    const payload: GitHubWebhookPayload = JSON.parse(rawBody);
    const repoFullName = payload.repository?.full_name;
    
    if (!repoFullName) {
      return NextResponse.json({ error: 'Missing repository info' }, { status: 400 });
    }
    
    const db = await getDb();
    
    // Find project by GitHub repo
    const [owner, repo] = repoFullName.split('/');
    const project = await db.collection<Project>('projects').findOne({
      'github.owner': { $regex: new RegExp(`^${owner}$`, 'i') },
      'github.repo': { $regex: new RegExp(`^${repo}$`, 'i') },
    });
    
    if (!project) {
      console.log(`[GitHub Webhook] No project found for ${repoFullName}`);
      return NextResponse.json({ 
        ok: true, 
        message: 'No project configured for this repo',
        repo: repoFullName,
      });
    }
    
    // Verify webhook signature if secret is configured
    if (project.github?.webhookSecret) {
      if (!verifySignature(rawBody, signature, project.github.webhookSecret)) {
        console.log(`[GitHub Webhook] Signature verification failed for ${repoFullName}`);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }
    
    const tenantId = project.tenantId;
    const boardId = project.boardId;
    
    // Get board for column info
    const board = await db.collection<Board>('boards').findOne({ id: boardId, tenantId });
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    
    let actionsPerformed: string[] = [];
    
    // Handle different event types
    if (event === 'pull_request' && payload.pull_request) {
      const pr = payload.pull_request;
      const action = payload.action;
      
      console.log(`[GitHub Webhook] PR #${pr.number} ${action}: ${pr.title}`);
      
      // Extract task references from PR title and body
      const textToSearch = `${pr.title} ${pr.body || ''}`;
      const taskRefs = extractTaskRefs(textToSearch);
      const linkedTasks = await findTasksByRefs(db, tenantId, taskRefs);
      
      // Create/update external link for each linked task
      if (project.github?.autoLinkPRs) {
        for (const task of linkedTasks) {
          const linkId = `link_${task.id}_pr_${pr.number}`;
          
          const linkStatus = pr.merged ? 'merged' : pr.state === 'closed' ? 'closed' : pr.draft ? 'draft' : 'open';
          
          await db.collection<ExternalLink>('external_links').updateOne(
            { id: linkId },
            {
              $set: {
                tenantId,
                taskId: task.id,
                boardId,
                type: 'github_pr',
                externalId: String(pr.number),
                url: pr.html_url,
                title: pr.title,
                status: linkStatus,
                github: {
                  owner,
                  repo,
                  number: pr.number,
                  author: pr.user.login,
                  labels: pr.labels.map((l) => l.name),
                  headBranch: pr.head.ref,
                  baseBranch: pr.base.ref,
                },
                updatedAt: new Date(),
                syncedAt: new Date(),
              },
              $setOnInsert: {
                id: linkId,
                createdAt: new Date(),
              },
            },
            { upsert: true }
          );
          
          actionsPerformed.push(`Linked PR #${pr.number} to task "${task.title}"`);
        }
      }
      
      // Auto-move tasks when PR is merged
      if (action === 'closed' && pr.merged && project.github?.autoMoveTasks) {
        const doneColumn = board.columns?.find((c) => 
          c.title.toLowerCase().includes('done') || c.title.toLowerCase().includes('complete')
        );
        
        if (doneColumn && linkedTasks.length > 0) {
          for (const task of linkedTasks) {
            if (task.columnId !== doneColumn.id) {
              const fromColumn = board.columns?.find((c) => c.id === task.columnId);
              
              await db.collection<Task>('tasks').updateOne(
                { id: task.id, tenantId },
                { $set: { columnId: doneColumn.id, updatedAt: new Date() } }
              );
              
              await logActivity({
                tenantId,
                taskId: task.id,
                boardId,
                action: 'moved',
                actor: 'system',
                details: {
                  from: fromColumn?.title,
                  to: doneColumn.title,
                  note: `Auto-moved: PR #${pr.number} merged`,
                },
              });
              
              actionsPerformed.push(`Moved "${task.title}" to Done (PR #${pr.number} merged)`);
            }
          }
        }
      }
      
      // Create task for new PRs that need review
      if (action === 'opened' && !pr.draft) {
        // Check if we should create a review task
        const automations = await db.collection<AutomationRule>('automations').find({
          tenantId,
          trigger: 'github_pr_opened',
          enabled: true,
          $or: [{ projectId: project.id }, { projectId: { $exists: false } }],
        }).toArray();
        
        for (const rule of automations) {
          if (rule.action === 'create_task') {
            const reviewColumn = board.columns?.find((c) => 
              c.title.toLowerCase().includes('review')
            ) || board.columns?.[1];
            
            if (reviewColumn) {
              const lastTask = await db
                .collection<Task>('tasks')
                .findOne({ tenantId, columnId: reviewColumn.id }, { sort: { order: -1 } });
              
              const taskTitle = rule.actionParams.title
                ?.replace('{{pr.title}}', pr.title)
                .replace('{{pr.number}}', String(pr.number))
                .replace('{{pr.author}}', pr.user.login)
                || `Review PR #${pr.number}: ${pr.title}`;
              
              const newTask: Task = {
                id: generateId('task'),
                tenantId,
                title: taskTitle,
                description: `PR: ${pr.html_url}\n\nOpened by @${pr.user.login}`,
                columnId: reviewColumn.id,
                boardId,
                order: lastTask ? lastTask.order + 1 : 0,
                priority: (rule.actionParams.priority as any) || 'p2',
                labels: ['pr-review'],
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'system',
              };
              
              await db.collection<Task>('tasks').insertOne(newTask);
              
              // Create external link
              await db.collection<ExternalLink>('external_links').insertOne({
                id: generateId('link'),
                tenantId,
                taskId: newTask.id,
                boardId,
                type: 'github_pr',
                externalId: String(pr.number),
                url: pr.html_url,
                title: pr.title,
                status: 'open',
                github: {
                  owner,
                  repo,
                  number: pr.number,
                  author: pr.user.login,
                  labels: pr.labels.map((l) => l.name),
                  headBranch: pr.head.ref,
                  baseBranch: pr.base.ref,
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                syncedAt: new Date(),
              });
              
              await logActivity({
                tenantId,
                taskId: newTask.id,
                boardId,
                action: 'created',
                actor: 'system',
                details: { note: `Auto-created from PR #${pr.number}` },
              });
              
              actionsPerformed.push(`Created review task for PR #${pr.number}`);
              
              // Update automation trigger count
              await db.collection<AutomationRule>('automations').updateOne(
                { id: rule.id },
                { 
                  $set: { lastTriggeredAt: new Date() },
                  $inc: { triggerCount: 1 },
                }
              );
            }
          }
        }
      }
    }
    
    // Handle issue events
    if (event === 'issues' && payload.issue) {
      const issue = payload.issue;
      const action = payload.action;
      
      console.log(`[GitHub Webhook] Issue #${issue.number} ${action}: ${issue.title}`);
      
      // Create task from issue if configured
      if (action === 'opened' && project.github?.createTasksFromIssues) {
        const todoColumn = board.columns?.find((c) => 
          c.title.toLowerCase().includes('to do') || c.title.toLowerCase() === 'todo'
        ) || board.columns?.[0];
        
        if (todoColumn) {
          const lastTask = await db
            .collection<Task>('tasks')
            .findOne({ tenantId, columnId: todoColumn.id }, { sort: { order: -1 } });
          
          const newTask: Task = {
            id: generateId('task'),
            tenantId,
            title: issue.title,
            description: `GitHub Issue: ${issue.html_url}\n\n${issue.body || ''}`,
            columnId: todoColumn.id,
            boardId,
            order: lastTask ? lastTask.order + 1 : 0,
            priority: 'p2',
            labels: ['github-issue', ...issue.labels.map((l) => l.name)],
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'system',
          };
          
          await db.collection<Task>('tasks').insertOne(newTask);
          
          // Create external link
          await db.collection<ExternalLink>('external_links').insertOne({
            id: generateId('link'),
            tenantId,
            taskId: newTask.id,
            boardId,
            type: 'github_issue',
            externalId: String(issue.number),
            url: issue.html_url,
            title: issue.title,
            status: 'open',
            github: {
              owner,
              repo,
              number: issue.number,
              author: issue.user.login,
              labels: issue.labels.map((l) => l.name),
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            syncedAt: new Date(),
          });
          
          await logActivity({
            tenantId,
            taskId: newTask.id,
            boardId,
            action: 'created',
            actor: 'system',
            details: { note: `Created from GitHub issue #${issue.number}` },
          });
          
          actionsPerformed.push(`Created task from issue #${issue.number}`);
        }
      }
      
      // Update linked task when issue is closed
      if (action === 'closed') {
        // Find linked tasks
        const link = await db.collection<ExternalLink>('external_links').findOne({
          tenantId,
          type: 'github_issue',
          'github.number': issue.number,
          'github.owner': owner,
          'github.repo': repo,
        });
        
        if (link) {
          // Update link status
          await db.collection<ExternalLink>('external_links').updateOne(
            { id: link.id },
            { $set: { status: 'closed', updatedAt: new Date(), syncedAt: new Date() } }
          );
          
          // Optionally move task to done
          if (project.github?.autoMoveTasks) {
            const doneColumn = board.columns?.find((c) => 
              c.title.toLowerCase().includes('done')
            );
            
            if (doneColumn) {
              const task = await db.collection<Task>('tasks').findOne({ id: link.taskId, tenantId });
              
              if (task && task.columnId !== doneColumn.id) {
                const fromColumn = board.columns?.find((c) => c.id === task.columnId);
                
                await db.collection<Task>('tasks').updateOne(
                  { id: task.id, tenantId },
                  { $set: { columnId: doneColumn.id, updatedAt: new Date() } }
                );
                
                await logActivity({
                  tenantId,
                  taskId: task.id,
                  boardId,
                  action: 'moved',
                  actor: 'system',
                  details: {
                    from: fromColumn?.title,
                    to: doneColumn.title,
                    note: `Auto-moved: Issue #${issue.number} closed`,
                  },
                });
                
                actionsPerformed.push(`Moved task to Done (Issue #${issue.number} closed)`);
              }
            }
          }
        }
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`[GitHub Webhook] Completed in ${duration}ms. Actions: ${actionsPerformed.length}`);
    
    return NextResponse.json({
      ok: true,
      event,
      repo: repoFullName,
      actions: actionsPerformed,
      duration,
    });
  } catch (error) {
    console.error('[GitHub Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: String(error) },
      { status: 500 }
    );
  }
}

// Also handle GET for webhook verification
export async function GET() {
  return NextResponse.json({ ok: true, message: 'GitHub webhook endpoint ready' });
}
