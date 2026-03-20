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
});

type CourseFormData = z.infer<typeof courseSchema>;

export const CourseManagement = ({ user }: CourseManagementProps) => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([
    {
      id: "2",
      courseCode: "1305312",
      title: "Senior Project 2",
      description: "Advanced concepts in database design and implementation",
      semester: "2",
      year: "2024",
      credits: 3,
      instructor: "Dr. Johnson",
      advisorEmail: "johnson@university.edu",
      enrollmentCount: 18,
      createdAt: "2024-01-20",
    },
    {
      id: "1",
      courseCode: "1305394",
      title: "Senior Project 1",
      description: "Final year capstone project course",
      semester: "1",
      year: "2024",
      credits: 6,
      instructor: "Dr. Smith",
      advisorEmail: "smith@university.edu",
      enrollmentCount: 25,
      createdAt: "2024-01-15",
    },
  ]);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [assigningCourse, setAssigningCourse] = useState<Course | null>(null);
  const [assignAdvisorName, setAssignAdvisorName] = useState("");
  const [assignAdvisorEmail, setAssignAdvisorEmail] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      courseCode: "",
      title: "",
      description: "",
      semester: "" as any,
      year: "",
      credits: "",
      instructor: "",
    },
  });

  const onSubmit = (data: CourseFormData) => {
    const newCourse: Course = {
      id: editingCourse ? editingCourse.id : Date.now().toString(),
      courseCode: data.courseCode,
      title: data.title,
      description: data.description || "",
      semester: data.semester,
      year: data.year,
      credits: parseInt(data.credits),
      instructor: data.instructor,
      advisorEmail: editingCourse ? editingCourse.advisorEmail : user.email,
      enrollmentCount: editingCourse ? editingCourse.enrollmentCount : 0,
      createdAt: editingCourse
        ? editingCourse.createdAt
        : new Date().toISOString().split("T")[0],
    };

    if (editingCourse) {
      setCourses(
        courses.map((course) =>
          course.id === editingCourse.id ? newCourse : course,
        ),
      );
      toast({
        title: "Course Updated",
        description: "Course has been successfully updated.",
      });
    } else {
      setCourses([...courses, newCourse]);
      toast({
        title: "Course Created",
        description: "New course has been successfully created.",
      });
    }

    setIsCreateDialogOpen(false);
    setEditingCourse(null);
    form.reset();
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    form.reset({
      courseCode: course.courseCode,
      title: course.title,
      description: course.description,
      semester: course.semester,
      year: course.year,
      credits: course.credits.toString(),
      instructor: course.instructor,
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (courseId: string) => {
    setCourses(courses.filter((course) => course.id !== courseId));
    toast({
      title: "Course Deleted",
      description: "Course has been successfully deleted.",
      variant: "destructive",
    });
  };

  const handleOpenAssign = (course: Course) => {
    setAssigningCourse(course);
    setAssignAdvisorName("");
    setAssignAdvisorEmail("");
    setIsAssignDialogOpen(true);
  };

  const handleAssign = () => {
    const trimmedName = assignAdvisorName.trim();
    const trimmedEmail = assignAdvisorEmail.trim();

    if (!assigningCourse || !trimmedName || !trimmedEmail) {
      toast({
        title: "Missing Data",
        description: "Advisor name and email are required.",
        variant: "destructive",
      });
      return;
    }

    setCourses((prev) =>
      prev.map((course) =>
        course.id === assigningCourse.id
          ? {
              ...course,
              instructor: trimmedName,
              advisorEmail: trimmedEmail,
            }
          : course,
      ),
    );

    toast({
      title: "Advisor Assigned",
      description: "Advisor details updated successfully.",
    });

    setIsAssignDialogOpen(false);
    setAssigningCourse(null);
    setAssignAdvisorName("");
    setAssignAdvisorEmail("");
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
                  instructor: "",
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
                          defaultValue={field.value}
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

                <div className="grid grid-cols-2 gap-4">
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

                  <FormField
                    control={form.control}
                    name="instructor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instructor</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                  <Button type="submit">
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
                <Button type="button" onClick={handleAssign}>
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
