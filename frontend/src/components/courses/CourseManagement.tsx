import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, Users, Calendar, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCourses } from "@/hooks/use-courses";
import { createCourse, deleteCourse, updateCourse } from "@/services/courseApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface User {
  id: string;
  name: string;
  email: string;
  role: "student" | "coordinator" | "advisor";
}

interface Course {
  id: string;
  courseCode: string;
  title: string;
  description: string;
  semester: "1" | "2";
  year: string;
  credits: number;
  instructor: string;
  advisorEmail: string;
  enrollmentCount: number;
  createdAt: string;
}

interface CourseManagementProps {
  user: User;
  authToken: string | null;
}

const courseSchema = z.object({
  courseCode: z.string().min(1, "Course code is required"),
  title: z.string().min(1, "Course title is required"),
  description: z.string().optional(),
  semester: z
    .enum(["", "1", "2"])
    .refine((val) => val !== "", "Semester is required"),
  year: z.string().min(4, "Year must be at least 4 digits"),
  credits: z.string().min(1, "Credits are required"),
  instructor: z.string().min(1, "Instructor is required"),
  advisorEmail: z.string().email("Valid advisor email is required"),
});

type CourseFormData = z.infer<typeof courseSchema>;

export const CourseManagement = ({
  user,
  authToken,
}: CourseManagementProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: coursesData = [], isLoading } = useCourses(authToken);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [assigningCourse, setAssigningCourse] = useState<Course | null>(null);
  const [assignAdvisorName, setAssignAdvisorName] = useState("");
  const [assignAdvisorEmail, setAssignAdvisorEmail] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  const createMutation = useMutation({
    mutationFn: async (data: CourseFormData) => {
      if (!authToken) throw new Error("No auth token");
      return createCourse(
        {
          courseCode: data.courseCode,
          title: data.title,
          description: data.description,
          semester: data.semester,
          year: data.year,
          credits: parseInt(data.credits),
          instructor: data.instructor,
          advisorEmail: data.advisorEmail,
        },
        authToken,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses", authToken] });
      toast({
        title: "Course Created",
        description: "New course has been successfully created.",
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CourseFormData) => {
      if (!authToken) throw new Error("No auth token");
      if (!editingCourse) throw new Error("No course selected for update");

      return updateCourse(
        editingCourse.id,
        {
          courseCode: data.courseCode,
          title: data.title,
          description: data.description,
          semester: data.semester,
          year: data.year,
          credits: parseInt(data.credits),
          instructor: data.instructor,
          advisorEmail: data.advisorEmail,
        },
        authToken,
      );
    },
    onSuccess: (updatedCourse) => {
      queryClient.setQueryData(["courses", authToken], (prev: any) => {
        if (!Array.isArray(prev)) {
          return prev;
        }

        return prev.map((course) =>
          String(course.id) === String(updatedCourse.id)
            ? {
                ...course,
                courseCode: updatedCourse.courseCode,
                title: updatedCourse.title ?? course.title,
                semester: updatedCourse.semester,
                year: updatedCourse.year,
                credits: updatedCourse.credits,
                advisorEmail: updatedCourse.advisorEmail,
                advisorName: updatedCourse.advisorName,
              }
            : course,
        );
      });
      queryClient.invalidateQueries({ queryKey: ["courses", authToken] });
      toast({
        title: "Course Updated",
        description: "Course has been successfully updated.",
      });
      setIsCreateDialogOpen(false);
      setEditingCourse(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (courseId: string) => {
      if (!authToken) throw new Error("No auth token");
      return deleteCourse(courseId, authToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses", authToken] });
      toast({
        title: "Course Deleted",
        description: "Course has been successfully deleted.",
        variant: "destructive",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!authToken) throw new Error("No auth token");
      if (!assigningCourse) throw new Error("No course selected for assignment");

      const trimmedName = assignAdvisorName.trim();
      const trimmedEmail = assignAdvisorEmail.trim();

      if (!trimmedName) {
        throw new Error("Advisor name is required.");
      }

      if (!trimmedEmail) {
        throw new Error("Advisor email is required.");
      }

      return updateCourse(
        assigningCourse.id,
        {
          courseCode: assigningCourse.courseCode,
          title: assigningCourse.title,
          description: assigningCourse.description,
          semester: assigningCourse.semester,
          year: assigningCourse.year,
          credits: assigningCourse.credits,
          instructor: trimmedName,
          advisorEmail: trimmedEmail,
        },
        authToken,
      );
    },
    onSuccess: (updatedCourse) => {
      queryClient.setQueryData(["courses", authToken], (prev: any) => {
        if (!Array.isArray(prev)) {
          return prev;
        }

        return prev.map((course) =>
          String(course.id) === String(updatedCourse.id)
            ? {
                ...course,
                advisorEmail: updatedCourse.advisorEmail,
                advisorName: updatedCourse.advisorName,
              }
            : course,
        );
      });
      queryClient.invalidateQueries({ queryKey: ["courses", authToken] });
      toast({
        title: "Advisor Assigned",
        description: "Advisor information has been updated for this course.",
      });
      setIsAssignDialogOpen(false);
      setAssigningCourse(null);
      setAssignAdvisorName("");
      setAssignAdvisorEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      courseCode: "",
      title: "",
      description: "",
      semester: "" as any,
      year: "",
      credits: "",
      instructor: user.name || "",
      advisorEmail: user.email || "",
    },
  });

  const onSubmit = (data: CourseFormData) => {
    if (editingCourse) {
      updateMutation.mutate(data);
      return;
    }
    createMutation.mutate(data);
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    form.reset({
      courseCode: course.courseCode,
      title: course.title,
      description: course.description,
      semester: course.semester,
      year: course.year,
      credits: String(course.credits),
      instructor: course.instructor,
      advisorEmail: course.advisorEmail,
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (courseId: string) => {
    deleteMutation.mutate(courseId);
  };

  const handleOpenAssign = (course: Course) => {
    setAssigningCourse(course);
    setAssignAdvisorName(course.instructor === "TBD" ? "" : course.instructor);
    setAssignAdvisorEmail(course.advisorEmail);
    setIsAssignDialogOpen(true);
  };

  const handleAssign = () => {
    assignMutation.mutate();
  };

  const getSemesterBadgeColor = (semester: string) => {
    switch (semester) {
      case "1":
        return "bg-orange-100 text-orange-800";
      case "2":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const courses = coursesData.map((c) => ({
    id: c.id,
    courseCode: c.courseCode,
    title: c.title || c.courseCode,
    description: "",
    semester: c.semester as "1" | "2",
    year: c.year,
    credits: c.credits,
    instructor: c.advisorName || "TBD",
    advisorEmail: c.advisorEmail,
    enrollmentCount: 0,
    createdAt: "",
  }));

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      searchTerm === "" ||
      course.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSemester =
      semesterFilter === "all" || course.semester === semesterFilter;
    const matchesYear = yearFilter === "all" || course.year === yearFilter;
    return matchesSearch && matchesSemester && matchesYear;
  });

  const uniqueYears = [...new Set(courses.map((course) => course.year))].sort(
    (a, b) => b.localeCompare(a),
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Course Management
          </h1>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingCourse(null);
                form.reset({
                  courseCode: "",
                  title: "",
                  description: "",
                  semester: "" as any,
                  year: "",
                  credits: "",
                  instructor: user.name || "",
                  advisorEmail: user.email || "",
                });
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCourse ? "Edit Course" : "Create New Course"}
              </DialogTitle>
              <DialogDescription>
                {editingCourse
                  ? "Update course information"
                  : "Add a new course for the academic semester"}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="courseCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 1305394" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Senior Project 1"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Course description..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="semester"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Semester</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select semester" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 2025" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="credits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credits</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="3" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setEditingCourse(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                  >
                    {editingCourse ? "Update Course" : "Create Course"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Advisor</DialogTitle>
              <DialogDescription>
                Enter advisor name and email for this course.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="assign-advisor-name">Advisor Name</Label>
                <Input
                  id="assign-advisor-name"
                  value={assignAdvisorName}
                  onChange={(e) => setAssignAdvisorName(e.target.value)}
                  placeholder="Enter advisor name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assign-advisor-email">Advisor Email</Label>
                <Input
                  id="assign-advisor-email"
                  type="email"
                  value={assignAdvisorEmail}
                  onChange={(e) => setAssignAdvisorEmail(e.target.value)}
                  placeholder="advisor@university.edu"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAssignDialogOpen(false);
                    setAssigningCourse(null);
                    setAssignAdvisorName("");
                    setAssignAdvisorEmail("");
                  }}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleAssign} disabled={assignMutation.isPending}>
                  Assign
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {/* Search and Filter Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by course code or title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select
                  value={semesterFilter}
                  onValueChange={setSemesterFilter}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Semesters</SelectItem>
                    <SelectItem value="1">Semester 1</SelectItem>
                    <SelectItem value="2">Semester 2</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {uniqueYears.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              All Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Advisor Email</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">
                      {course.courseCode}
                    </TableCell>
                    <TableCell>{course.title}</TableCell>
                    <TableCell>
                      <Badge className={getSemesterBadgeColor(course.semester)}>
                        {course.semester}
                      </Badge>
                    </TableCell>
                    <TableCell>{course.year}</TableCell>
                    <TableCell>{course.credits}</TableCell>
                    <TableCell>{course.instructor}</TableCell>
                    <TableCell>{course.advisorEmail}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(course)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAssign(course)}
                        >
                          Assign
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(course.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
