# Feature Implementation Plan: Due Dates, Assignees, Checklists, Search

## Overview

Four high-priority features to bring Clawd Kanban to parity with competitors.

| Feature | Complexity | Estimate |
|---------|-----------|----------|
| Due Dates | Low | 1-2 hours |
| Assignees | Medium | 2-3 hours |
| Checklists | Medium | 2-3 hours |
| Search/Filter | Medium | 2-3 hours |

---

## 1. Due Dates 📅

### Current State
- ✅ `dueDate` field exists in Task interface
- ❌ No date picker in UI
- ❌ No visual indicator on cards
- ❌ No overdue highlighting

### Schema Changes
None needed — `dueDate?: Date` already exists.

### API Changes
None needed — already accepted in POST/PATCH.

### UI Changes

#### TaskCard.tsx
```tsx
// Add due date chip below title
{task.dueDate && (
  <Chip
    icon={<CalendarToday />}
    label={formatDueDate(task.dueDate)}
    size="small"
    color={isOverdue(task.dueDate) ? 'error' : 'default'}
  />
)}
```

#### TaskDialog.tsx (edit dialog)
```tsx
// Add date picker
<DatePicker
  label="Due Date"
  value={dueDate}
  onChange={setDueDate}
  slotProps={{ textField: { size: 'small', fullWidth: true } }}
/>
```

#### TaskDetailDialog.tsx
- Show due date in header
- Allow editing due date inline

### Helper Functions
```typescript
function formatDueDate(date: Date): string {
  const d = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(date: Date): boolean {
  return new Date(date) < new Date() && !isToday(date);
}
```

### Dependencies
- `@mui/x-date-pickers` (already in MUI ecosystem)

---

## 2. Assignees 👤

### Current State
- ❌ No assignee field
- ❌ No user management

### Schema Changes

#### types/kanban.ts
```typescript
export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface Task {
  // ... existing fields
  assigneeId?: string;  // User ID
  assignee?: User;      // Populated for display
}
```

#### Database
- New `users` collection (or use simple hardcoded list for MVP)
- Add `assigneeId` to tasks

### API Changes

#### GET /api/users
```json
[
  { "id": "mike", "name": "Mike", "avatar": null },
  { "id": "moltbot", "name": "Moltbot", "avatar": "🔥" }
]
```

#### POST/PATCH /api/tasks
- Accept `assigneeId` field

### UI Changes

#### TaskCard.tsx
```tsx
// Add assignee avatar in corner
{task.assignee && (
  <Avatar sx={{ width: 24, height: 24 }}>
    {task.assignee.avatar || task.assignee.name[0]}
  </Avatar>
)}
```

#### TaskDialog.tsx
```tsx
// Add assignee dropdown
<Autocomplete
  options={users}
  getOptionLabel={(u) => u.name}
  value={assignee}
  onChange={(_, v) => setAssignee(v)}
  renderInput={(params) => <TextField {...params} label="Assignee" />}
/>
```

### MVP Simplification
For MVP, hardcode users instead of full user management:
```typescript
const USERS = [
  { id: 'mike', name: 'Mike' },
  { id: 'moltbot', name: 'Moltbot' },
];
```

---

## 3. Checklists ✅

### Current State
- ❌ No subtasks/checklists

### Schema Changes

#### types/kanban.ts
```typescript
export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  order: number;
}

export interface Task {
  // ... existing fields
  checklist?: ChecklistItem[];
}
```

### API Changes

#### PATCH /api/tasks/[taskId]
- Accept `checklist` array
- Support partial updates (toggle single item)

#### Optional: Dedicated endpoints
- POST /api/tasks/[taskId]/checklist - Add item
- PATCH /api/tasks/[taskId]/checklist/[itemId] - Toggle/update
- DELETE /api/tasks/[taskId]/checklist/[itemId] - Remove

### UI Changes

#### TaskCard.tsx
```tsx
// Show progress indicator
{task.checklist?.length > 0 && (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
    <CheckCircle fontSize="small" />
    <Typography variant="caption">
      {completed}/{total}
    </Typography>
    <LinearProgress 
      variant="determinate" 
      value={(completed/total) * 100} 
      sx={{ flex: 1, height: 4 }}
    />
  </Box>
)}
```

#### TaskDetailDialog.tsx
```tsx
// Full checklist editor
<Box>
  <Typography variant="subtitle2">Checklist</Typography>
  {checklist.map((item) => (
    <Box key={item.id} sx={{ display: 'flex', alignItems: 'center' }}>
      <Checkbox 
        checked={item.completed} 
        onChange={() => toggleItem(item.id)} 
      />
      <Typography sx={{ textDecoration: item.completed ? 'line-through' : 'none' }}>
        {item.text}
      </Typography>
      <IconButton size="small" onClick={() => deleteItem(item.id)}>
        <Delete fontSize="small" />
      </IconButton>
    </Box>
  ))}
  <TextField 
    placeholder="Add item..." 
    size="small"
    onKeyDown={(e) => e.key === 'Enter' && addItem()}
  />
</Box>
```

---

## 4. Search & Filter 🔍

### Current State
- ❌ No search
- ❌ No filtering

### API Changes

#### GET /api/tasks
Add query params:
- `?q=keyword` - Text search (title, description)
- `?label=bug` - Filter by label
- `?assignee=mike` - Filter by assignee
- `?priority=p1` - Filter by priority
- `?overdue=true` - Only overdue tasks
- `?boardId=xxx` - Filter by board (existing)

```typescript
// In route.ts
const query: Record<string, unknown> = {};

if (q) {
  query.$or = [
    { title: { $regex: q, $options: 'i' } },
    { description: { $regex: q, $options: 'i' } },
  ];
}
if (label) query.labels = label;
if (assignee) query.assigneeId = assignee;
if (priority) query.priority = priority;
if (overdue === 'true') query.dueDate = { $lt: new Date() };
```

### UI Changes

#### New: SearchFilterBar.tsx
```tsx
<Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
  {/* Search input */}
  <TextField
    placeholder="Search tasks..."
    size="small"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    InputProps={{
      startAdornment: <Search />,
    }}
  />
  
  {/* Filter chips */}
  <Autocomplete
    multiple
    options={allLabels}
    value={selectedLabels}
    onChange={(_, v) => setSelectedLabels(v)}
    renderInput={(params) => <TextField {...params} placeholder="Labels" size="small" />}
  />
  
  <Select value={assigneeFilter} onChange={...} size="small">
    <MenuItem value="">All assignees</MenuItem>
    {users.map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
  </Select>
  
  <FormControlLabel
    control={<Checkbox checked={showOverdue} onChange={...} />}
    label="Overdue only"
  />
</Box>
```

#### KanbanBoard.tsx
- Add SearchFilterBar above columns
- Filter tasks client-side or refetch with params
- Highlight matching text in cards

### Keyboard Shortcut
- `Cmd/Ctrl + K` or `/` to focus search

---

## Implementation Order

### Phase 1: Due Dates (Quick Win)
1. Add MUI date picker dependency
2. Update TaskDialog with date picker
3. Update TaskCard to show due date chip
4. Add overdue styling
5. Update TaskDetailDialog

### Phase 2: Assignees
1. Create hardcoded user list (MVP)
2. Update Task schema
3. Add assignee dropdown to TaskDialog
4. Show avatar on TaskCard
5. Add to TaskDetailDialog

### Phase 3: Checklists
1. Update Task schema with checklist array
2. Add checklist section to TaskDetailDialog
3. Show progress on TaskCard
4. Add activity logging for checklist changes

### Phase 4: Search & Filter
1. Add query param support to API
2. Create SearchFilterBar component
3. Integrate into KanbanBoard
4. Add keyboard shortcut

---

## Files to Modify

| File | Due Dates | Assignees | Checklists | Search |
|------|:---------:|:---------:|:----------:|:------:|
| `types/kanban.ts` | - | ✏️ | ✏️ | - |
| `TaskCard.tsx` | ✏️ | ✏️ | ✏️ | - |
| `TaskDialog.tsx` | ✏️ | ✏️ | - | - |
| `TaskDetailDialog.tsx` | ✏️ | ✏️ | ✏️ | - |
| `KanbanBoard.tsx` | - | - | - | ✏️ |
| `api/tasks/route.ts` | - | ✏️ | ✏️ | ✏️ |
| **New:** `SearchFilterBar.tsx` | - | - | - | ✏️ |
| **New:** `api/users/route.ts` | - | ✏️ | - | - |

---

## Ready to Start?

Let me know which phase to begin, or I'll start with Phase 1 (Due Dates) since it's the quickest win.
