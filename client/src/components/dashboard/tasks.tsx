import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PlusIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: number;
  title: string;
  dueDate: string;
  completed: boolean;
}

interface TasksProps {
  initialTasks?: Task[];
}

export default function Tasks({ initialTasks = [] }: TasksProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const toggleTaskCompletion = (taskId: number) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const addTask = () => {
    if (!newTaskTitle.trim()) {
      toast({
        variant: "destructive",
        title: "Task title is required",
        description: "Please enter a title for your task."
      });
      return;
    }

    const newTask: Task = {
      id: Date.now(),
      title: newTaskTitle,
      dueDate: newTaskDueDate || "No due date",
      completed: false
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle("");
    setNewTaskDueDate("");
    setIsDialogOpen(false);

    toast({
      title: "Task added",
      description: "Your new task has been added successfully."
    });
  };

  return (
    <Card>
      <CardHeader className="p-6 border-b border-border flex justify-between items-center">
        <CardTitle className="text-lg font-medium font-serif text-foreground">Upcoming Tasks</CardTitle>
        <Button variant="link" className="text-sm text-primary hover:text-opacity-80 p-0">
          View All
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        <ul className="divide-y divide-border">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <li key={task.id} className="py-3">
                <div className="flex items-center">
                  <Checkbox
                    id={`task-${task.id}`}
                    checked={task.completed}
                    onCheckedChange={() => toggleTaskCompletion(task.id)}
                    className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                  />
                  <Label htmlFor={`task-${task.id}`} className="ml-3 block">
                    <span className={`text-sm font-medium ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {task.title}
                    </span>
                    <span className="block text-xs text-muted-foreground">Due {task.dueDate}</span>
                  </Label>
                </div>
              </li>
            ))
          ) : (
            <li className="py-3 text-center text-muted-foreground">
              No tasks yet. Add your first task!
            </li>
          )}
        </ul>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full flex items-center justify-center px-4 py-2 text-sm mt-4"
            >
              <PlusIcon className="mr-2 h-4 w-4" /> Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="task-title">Task Title</Label>
                <Input
                  id="task-title"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Enter task title..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                  id="due-date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  placeholder="e.g., tomorrow, in 3 days"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={addTask}>
                Add Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
