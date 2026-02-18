import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    BookOpen, LogOut, User, FileDown, Loader2, FileSpreadsheet,
    MessageSquare, ClipboardList, BarChart3, GraduationCap, TrendingUp, Printer, FileText, Search
} from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { useLocation } from "wouter";
import {
    subjectsApi, academicTermsApi, teacherAssignmentsApi,
    gradingScalesApi, studentsApi, scoresApi, academicYearsApi
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { getGradeFromScales, GradingScale } from "@/lib/grading";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface TeacherAssignment {
    id: string;
    teacherId: string;
    subjectId: string;
    classLevel: string;
    isClassTeacher: boolean;
}

interface Subject {
    id: string;
    name: string;
    code: string;
    classLevels?: string[];
}

interface Student {
    id: string;
    studentId: string;
    name: string;
    grade: string;
}

interface Term {
    id: string;
    name: string;
    status: string;
    termNumber?: number;
    academicYearId?: string;
}

interface Score {
    id: string;
    studentId: string;
    subjectId: string;
    classScore: number;
    examScore: number;
    totalScore: number;
}

const NUMERIC_GRADE_SCALE = [
    { min: 80, max: 100, grade: 1, remark: "Excellent" },
    { min: 70, max: 79, grade: 2, remark: "Very Good" },
    { min: 60, max: 69, grade: 3, remark: "Good" },
    { min: 55, max: 59, grade: 4, remark: "Credit" },
    { min: 50, max: 54, grade: 5, remark: "Pass" },
    { min: 30, max: 49, grade: 6, remark: "Weak Pass" },
    { min: 20, max: 29, grade: 7, remark: "Weak" },
    { min: 10, max: 19, grade: 8, remark: "Very Weak" },
    { min: 0, max: 9, grade: 9, remark: "Fail" },
];

export default function TeacherBroadsheet() {
    const { username, logout, teacherInfo } = useAuth();
    const teacherId = teacherInfo?.id;
    const [, setLocation] = useLocation();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [loadingScores, setLoadingScores] = useState(false);
    const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [scores, setScores] = useState<Score[]>([]);
    const [gradingScales, setGradingScales] = useState<GradingScale[]>([]);
    const [academicYears, setAcademicYears] = useState<any[]>([]);

    const [selectedClass, setSelectedClass] = useState("");
    const [selectedTerm, setSelectedTerm] = useState("");

    const [previewStudent, setPreviewStudent] = useState<any | null>(null);
    const [studentTermDetails, setStudentTermDetails] = useState<any | null>(null);
    const [loadingReport, setLoadingReport] = useState(false);
    const [schoolLogoBase64, setSchoolLogoBase64] = useState<string>("");

    useEffect(() => {
        fetchInitialData();
        // Pre-load school logo for PDF
        const loadLogo = async () => {
            try {
                const response = await fetch("/school-logo.png");
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => {
                    setSchoolLogoBase64(reader.result as string);
                };
                reader.readAsDataURL(blob);
            } catch (e) {
                console.error("Failed to load school logo", e);
            }
        };
        loadLogo();
    }, [teacherId]);

    const fetchInitialData = async () => {
        try {
            const [subjectsData, termsData, gradingData, yearsData] = await Promise.all([
                subjectsApi.getAll(),
                academicTermsApi.getAll(),
                gradingScalesApi.getAll(),
                academicYearsApi.getAll(),
            ]);

            setSubjects(subjectsData);
            setTerms(termsData);
            setGradingScales(gradingData);
            setAcademicYears(yearsData);

            const active = termsData.find((t: Term) => t.status === "Active");
            if (active) {
                setSelectedTerm(active.id);
            }

            if (teacherId) {
                const assignmentsData = await teacherAssignmentsApi.getByTeacher(teacherId);
                setAssignments(assignmentsData);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to load data",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const uniqueClasses = Array.from(new Set(assignments.map(a => a.classLevel)));

    // Determine if teacher is class teacher for the selected class
    const isClassTeacherForSelectedClass = assignments.some(
        a => a.classLevel === selectedClass && a.isClassTeacher
    );

    // Get subjects to display based on role
    const getDisplaySubjects = () => {
        if (isClassTeacherForSelectedClass) {
            // Class teacher sees ALL subjects
            return subjects;
        }
        // Subject teacher sees ONLY their assigned subjects
        const assignedSubjectIds = assignments
            .filter(a => a.classLevel === selectedClass)
            .map(a => a.subjectId);
        return subjects.filter(s => assignedSubjectIds.includes(s.id));
    };

    const displaySubjects = getDisplaySubjects();

    useEffect(() => {
        if (selectedClass && selectedTerm && teacherId) {
            loadBroadsheetData();
        }
    }, [selectedClass, selectedTerm, teacherId]);

    const loadBroadsheetData = async () => {
        if (!teacherId || !selectedClass || !selectedTerm) return;
        setLoadingScores(true);

        try {
            // Fetch students for this class
            const studentsResponse = await fetch(
                `/api/teachers/${teacherId}/students?classLevel=${encodeURIComponent(selectedClass)}`
            );
            if (studentsResponse.ok) {
                const studentsData = await studentsResponse.json();
                setStudents(studentsData);
            }

            // Fetch broadsheet scores (all subjects for the class)
            const scoresResponse = await fetch(
                `/api/teachers/${teacherId}/broadsheet-scores?termId=${selectedTerm}&classLevel=${encodeURIComponent(selectedClass)}`
            );
            if (scoresResponse.ok) {
                const scoresData = await scoresResponse.json();
                setScores(scoresData);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to load broadsheet data",
                variant: "destructive",
            });
        } finally {
            setLoadingScores(false);
        }
    };

    const classStudents = students.filter(s => s.grade === selectedClass);

    const getScore = (studentId: string, subjectId: string) => {
        const score = scores.find(s => s.studentId === studentId && s.subjectId === subjectId);
        return score ? score.totalScore : 0;
    };

    const getScoreDetails = (studentId: string, subjectId: string) => {
        const score = scores.find(s => s.studentId === studentId && s.subjectId === subjectId);
        return score
            ? { classScore: score.classScore || 0, examScore: score.examScore || 0, total: score.totalScore || 0 }
            : { classScore: 0, examScore: 0, total: 0 };
    };

    // For class teacher: total across ALL subjects
    const calculateTotal = (studentId: string) => {
        return subjects.reduce((sum, sub) => sum + getScore(studentId, sub.id), 0);
    };

    // For class teacher: average across ALL subjects
    const calculateAverage = (studentId: string) => {
        if (subjects.length === 0) return 0;
        const total = subjects.reduce((sum, s) => sum + getScore(studentId, s.id), 0);
        return parseFloat((total / subjects.length).toFixed(1));
    };

    const getNumericGrade = (score: number): number => {
        if (score === 0) return 0;
        const entry = NUMERIC_GRADE_SCALE.find(g => score >= g.min && score <= g.max);
        return entry ? entry.grade : 9;
    };

    const getGradeRemark = (score: number): string => {
        if (score === 0) return "-";
        const entry = NUMERIC_GRADE_SCALE.find(g => score >= g.min && score <= g.max);
        return entry ? entry.remark : "Fail";
    };

    // For class teacher: overall position
    const getOverallRankedStudents = () => {
        return [...classStudents]
            .filter(s => subjects.some(sub => getScore(s.id, sub.id) > 0))
            .sort((a, b) => calculateAverage(b.id) - calculateAverage(a.id));
    };

    const getStudentOverallPosition = (studentId: string) => {
        const ranked = getOverallRankedStudents();
        const index = ranked.findIndex(s => s.id === studentId);
        return index >= 0 ? index + 1 : null;
    };

    // For subject teacher: rank students by a specific subject's score
    const getSubjectRankedStudents = (subjectId: string) => {
        return [...classStudents]
            .filter(s => getScore(s.id, subjectId) > 0)
            .sort((a, b) => getScore(b.id, subjectId) - getScore(a.id, subjectId));
    };

    const getStudentSubjectPosition = (studentId: string, subjectId: string) => {
        const ranked = getSubjectRankedStudents(subjectId);
        const index = ranked.findIndex(s => s.id === studentId);
        return index >= 0 ? index + 1 : null;
    };

    const getPositionSuffix = (pos: number | null) => {
        if (!pos) return "-";
        const j = pos % 10;
        const k = pos % 100;
        if (j === 1 && k !== 11) return pos + "st";
        if (j === 2 && k !== 12) return pos + "nd";
        if (j === 3 && k !== 13) return pos + "rd";
        return pos + "th";
    };

    const rankedStudents = [...classStudents].sort((a, b) => calculateTotal(b.id) - calculateTotal(a.id));

    const getGradeInfo = (studentId: string) => {
        const subjectsWithScores = subjects.filter(sub => getScore(studentId, sub.id) > 0);
        if (subjectsWithScores.length === 0) return { grade: "-", description: "-" };
        const total = subjectsWithScores.reduce((sum, sub) => sum + getScore(studentId, sub.id), 0);
        const avg = Math.round(total / subjectsWithScores.length);
        return getGradeFromScales(avg, selectedClass, gradingScales);
    };

    // ===== PDF Export for Class Teacher (admin-style) =====
    const exportClassTeacherPDF = () => {
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        const termData = terms.find(t => t.id === selectedTerm);
        const termName = termData?.name || "";
        const termNumber = termData?.termNumber || "";
        const yearData = academicYears.find((y: any) => y.id === termData?.academicYearId);
        const yearName = yearData?.year || "";
        const today = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

        doc.setFillColor(0, 100, 0);
        doc.rect(0, 0, 297, 8, "F");

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 100, 0);
        doc.text("UNIVERSITY BASIC SCHOOL", 148.5, 18, { align: "center" });

        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(`${yearName} TERM ${termNumber}    BROADSHEET FOR    ${selectedClass?.toUpperCase()}`, 148.5, 26, { align: "center" });

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("SCORE AND POSITION OF STUDENTS", 148.5, 33, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`Number on Roll: ${classStudents.length}`, 14, 38);
        doc.text(`Term: ${termNumber}`, 70, 38);
        doc.text(today, 250, 38);

        const subjectHeaders = displaySubjects.flatMap(s => [s.name, ""]);
        const tableHead = [
            ["NAME OF STUDENTS", ...subjectHeaders, "TOT", "AVG", "POS"]
        ];

        const sortedStudents = [...classStudents].sort((a, b) => {
            return calculateAverage(b.id) - calculateAverage(a.id);
        });

        const tableBody = sortedStudents.map((student) => {
            const total = calculateTotal(student.id);
            const avg = calculateAverage(student.id);
            const position = getStudentOverallPosition(student.id);
            const posText = getPositionSuffix(position);

            const subjectScores = displaySubjects.flatMap(s => {
                const score = getScore(student.id, s.id);
                const grade = score > 0 ? getNumericGrade(score) : "";
                return [score || "", grade];
            });

            return [
                student.name.toUpperCase(),
                ...subjectScores,
                total || 0,
                avg || 0,
                posText
            ];
        });

        const subjectColStyles: any = {};
        displaySubjects.forEach((_, idx) => {
            const scoreCol = 1 + (idx * 2);
            const gradeCol = 2 + (idx * 2);
            subjectColStyles[scoreCol] = { cellWidth: 8, halign: "center" };
            subjectColStyles[gradeCol] = { cellWidth: 6, halign: "center", fillColor: [240, 240, 240] };
        });

        autoTable(doc, {
            head: tableHead,
            body: tableBody,
            startY: 42,
            theme: "grid",
            styles: { fontSize: 6, cellPadding: 1 },
            headStyles: {
                fillColor: [200, 220, 200],
                textColor: [0, 0, 0],
                fontStyle: "bold",
                halign: "center",
                fontSize: 5
            },
            columnStyles: {
                0: { cellWidth: 45 },
                ...subjectColStyles,
                [1 + displaySubjects.length * 2]: { cellWidth: 10, halign: "center", fontStyle: "bold" },
                [2 + displaySubjects.length * 2]: { cellWidth: 10, halign: "center" },
                [3 + displaySubjects.length * 2]: { cellWidth: 10, halign: "center" },
            },
            didParseCell: (data) => {
                if (data.section === "body") {
                    const colIdx = data.column.index;
                    if (colIdx > 0 && colIdx <= displaySubjects.length * 2) {
                        if (colIdx % 2 === 0) {
                            data.cell.styles.fillColor = [245, 245, 245];
                            data.cell.styles.fontSize = 5;
                        }
                    }
                    const cellValue = data.cell.raw;
                    if (cellValue === "Fail" || cellValue === 0) {
                        data.cell.styles.textColor = [200, 0, 0];
                    }
                }
            }
        });

        doc.save(`Broadsheet_${selectedClass}_${termName.replace(/\s+/g, "_")}.pdf`);
        toast({ title: "Success", description: "Broadsheet PDF exported successfully" });
    };

    // ===== Excel Export for Class Teacher =====
    const exportClassTeacherExcel = () => {
        const termData = terms.find(t => t.id === selectedTerm);
        const termName = termData?.name || "";
        const yearData = academicYears.find((y: any) => y.id === termData?.academicYearId);
        const yearName = yearData?.year || "";

        const headers = [
            "Position",
            "Student Name",
            "Student ID",
            ...displaySubjects.flatMap(s => [`${s.name} Score`, `${s.name} Grade`]),
            "Total",
            "Average",
            "Status"
        ];

        const sortedStudents = [...classStudents].sort((a, b) =>
            calculateAverage(b.id) - calculateAverage(a.id)
        );

        const data = sortedStudents.map((student) => {
            const total = calculateTotal(student.id);
            const avg = calculateAverage(student.id);
            const position = getStudentOverallPosition(student.id);

            const subjectData = displaySubjects.flatMap(s => {
                const score = getScore(student.id, s.id);
                const grade = score > 0 ? getNumericGrade(score) : "-";
                return [score || 0, grade];
            });

            return [
                getPositionSuffix(position),
                student.name,
                student.studentId,
                ...subjectData,
                total,
                avg,
                avg >= 50 ? "Pass" : "Fail"
            ];
        });

        const wsData = [
            ["UNIVERSITY BASIC SCHOOL - TARKWA"],
            [`${yearName} - ${termName} BROADSHEET FOR ${selectedClass}`],
            [`Number on Roll: ${classStudents.length}`],
            [],
            headers,
            ...data
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Broadsheet");

        ws["!cols"] = [
            { wch: 8 },
            { wch: 25 },
            { wch: 12 },
            ...displaySubjects.flatMap(() => [{ wch: 10 }, { wch: 8 }]),
            { wch: 8 },
            { wch: 8 },
            { wch: 8 }
        ];

        XLSX.writeFile(wb, `Broadsheet_${selectedClass}_${termName.replace(/\s+/g, "_")}.xlsx`);
        toast({ title: "Success", description: "Broadsheet Excel exported successfully" });
    };

    // ===== PDF Export for Subject Teacher =====
    const exportSubjectTeacherPDF = () => {
        const doc = new jsPDF({ orientation: "portrait" });
        const termName = terms.find(t => t.id === selectedTerm)?.name || "Term";

        doc.setFontSize(16);
        doc.text("UNIVERSITY BASIC SCHOOL - TARKWA", doc.internal.pageSize.width / 2, 15, { align: "center" });
        doc.setFontSize(11);
        doc.text(`Subject Broadsheet — ${selectedClass}`, 14, 24);
        doc.text(`${termName}`, 14, 30);
        doc.setFontSize(9);
        doc.text(`Subjects: ${displaySubjects.map(s => s.name).join(", ")}`, 14, 36);

        const tableHead = [
            ["Pos", "Student ID", "Name", ...displaySubjects.flatMap(s => [s.name, "Grade"]), "Rank"]
        ];

        // Rank by first assigned subject for simplicity; if multiple subjects, rank by average of assigned subjects
        const getSubjectAvg = (studentId: string) => {
            const totalScore = displaySubjects.reduce((sum, s) => sum + getScore(studentId, s.id), 0);
            const subjectsWithScores = displaySubjects.filter(s => getScore(studentId, s.id) > 0).length;
            return subjectsWithScores > 0 ? totalScore / subjectsWithScores : 0;
        };

        const sortedStudents = [...classStudents].sort((a, b) => getSubjectAvg(b.id) - getSubjectAvg(a.id));
        const rankedIds = sortedStudents.filter(s => getSubjectAvg(s.id) > 0).map(s => s.id);

        const tableBody = sortedStudents.map((student) => {
            const rankIdx = rankedIds.indexOf(student.id);
            const rank = rankIdx >= 0 ? getPositionSuffix(rankIdx + 1) : "-";
            const subjectCells = displaySubjects.flatMap(s => {
                const score = getScore(student.id, s.id);
                const grade = score > 0 ? getNumericGrade(score) : "-";
                return [score || "-", grade];
            });
            return [
                rankIdx >= 0 ? rankIdx + 1 : "-",
                student.studentId,
                student.name,
                ...subjectCells,
                rank
            ];
        });

        autoTable(doc, {
            head: tableHead,
            body: tableBody,
            startY: 40,
            theme: "grid",
            styles: { fontSize: 7, cellPadding: 2 },
            headStyles: { fillColor: [41, 128, 185], fontSize: 7 },
            columnStyles: {
                0: { cellWidth: 12 },
                1: { cellWidth: 22 },
                2: { cellWidth: 32 },
            },
        });

        doc.save(`Subject_Broadsheet_${selectedClass}_${termName}.pdf`);
        toast({ title: "Success", description: "Subject broadsheet PDF exported" });
    };

    const fetchStudentScores = async (studentId: string) => {
        if (!selectedTerm) return;
        setLoadingReport(true);
        try {
            const [details, allScores] = await Promise.all([
                studentsApi.getTermDetails(studentId, selectedTerm),
                scoresApi.getByTerm(selectedTerm)
            ]);
            setStudentTermDetails(details);
            setLoadingReport(false);
        } catch (error) {
            console.error("Failed to fetch report details", error);
            setLoadingReport(false);
        }
    };

    const handleStudentClick = (student: any) => {
        setPreviewStudent(student);
        fetchStudentScores(student.id);
    };

    const printStudentReport = async (student: any) => {
        if (!selectedTerm || !studentTermDetails) return;

        const termData = terms.find(t => t.id === selectedTerm);
        const termName = termData?.name || "";
        const yearData = academicYears.find((y: any) => y.id === termData?.academicYearId);
        const yearName = yearData?.year || "";

        const doc = new jsPDF();

        // Add logo if available
        if (schoolLogoBase64) {
            try {
                doc.addImage(schoolLogoBase64, 'PNG', 20, 10, 25, 25);
            } catch (e) {
                console.error("Could not add logo to PDF", e);
            }
        }

        // Header
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text("UNIVERSITY BASIC SCHOOL", 105, 18, { align: "center" });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("P.O. BOX 25, WINNEBA, GHANA", 105, 24, { align: "center" });
        doc.text("Email: info@universitybasic.edu.gh", 105, 29, { align: "center" });

        doc.setLineWidth(0.5);
        doc.line(20, 38, 190, 38);

        // Student Info
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("STUDENT TERMINAL REPORT", 105, 48, { align: "center" });

        doc.setFontSize(10);
        doc.text(`Name: ${student.name}`, 20, 60);
        doc.text(`Class: ${selectedClass}`, 140, 60);
        doc.text(`Student ID: ${student.studentId}`, 20, 66);
        doc.text(`Academic Period: ${yearName} - ${termName}`, 140, 66);

        // Subjects Table
        const tableBody = displaySubjects.map(sub => {
            const { classScore, examScore } = getScoreDetails(student.id, sub.id);
            const total = classScore + examScore;

            // Per-subject rank
            const classTotalScores = students
                .filter(s => s.grade === selectedClass)
                .map(s => {
                    const sScores = scores.filter(sc => sc.studentId === s.id && sc.subjectId === sub.id);
                    return sScores.reduce((sum, sc) => sum + sc.totalScore, 0);
                })
                .sort((a, b) => b - a);

            const position = classTotalScores.indexOf(total) + 1;
            const remark = getGradeFromScales(total, selectedClass, gradingScales).description;

            return [
                sub.name,
                classScore.toFixed(1),
                examScore.toFixed(1),
                total.toFixed(1),
                position.toString(),
                remark
            ];
        });

        autoTable(doc, {
            startY: 75,
            head: [["SUBJECT", "CLASS (50%)", "EXAM (50%)", "TOTAL (100%)", "POS", "REMARK"]],
            body: tableBody,
            theme: "grid",
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            styles: { fontSize: 8, cellPadding: 2 }
        });

        // Overall Performance
        const finalY = (doc as any).lastAutoTable.cursor.y + 15;
        const avg = calculateAverage(student.id);
        const overallPos = getStudentOverallPosition(student.id);

        doc.setFont("helvetica", "bold");
        doc.text("OVERALL PERFORMANCE", 20, finalY);
        doc.setFont("helvetica", "normal");
        doc.text(`Average Score: ${avg.toFixed(1)}%`, 20, finalY + 8);
        doc.text(`Overall Position: ${overallPos} out of ${classStudents.length}`, 20, finalY + 14);

        // Remarks
        doc.rect(20, finalY + 25, 170, 40);
        doc.setFont("helvetica", "bold");
        doc.text("CLASS TEACHER'S REMARKS", 25, finalY + 32);
        doc.setFont("helvetica", "italic");
        const remarks = studentTermDetails?.classTeacherRemark || "No remarks entered.";
        const splitRemarks = doc.splitTextToSize(remarks, 160);
        doc.text(splitRemarks, 25, finalY + 42);

        doc.save(`${student.name.replace(/\s+/g, "_")}_Report_${termName.replace(/\s+/g, "_")}.pdf`);
        toast({ title: "Success", description: "Report PDF generated" });
    };

    const handleLogout = () => {
        logout();
        setLocation("/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground">Loading broadsheet...</p>
                </div>
            </div>
        );
    }

    const currentTerm = terms.find(t => t.id === selectedTerm);

    // Stats
    const totalStudentsInClass = classStudents.length;
    const studentsWithScores = classStudents.filter(s => calculateTotal(s.id) > 0).length;

    // ===========================================
    // CLASS TEACHER VIEW — Admin-style broadsheet
    // ===========================================
    const renderClassTeacherBroadsheet = () => {
        const termData = terms.find(t => t.id === selectedTerm);
        const termName = termData?.name || "";
        const termNumber = termData?.termNumber || "";
        const yearData = academicYears.find((y: any) => y.id === termData?.academicYearId);
        const yearName = yearData?.year || "";
        const today = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

        const sortedStudentsByRank = [...classStudents].sort((a, b) =>
            calculateAverage(b.id) - calculateAverage(a.id)
        );

        return (
            <>
                {/* Admin-style broadsheet header */}
                <Card className="border-green-200">
                    <CardHeader className="bg-gradient-to-r from-green-700 to-green-600 text-white rounded-t-lg">
                        <div className="text-center">
                            <CardTitle className="text-lg font-bold">UNIVERSITY BASIC SCHOOL</CardTitle>
                            <p className="text-sm mt-1">{yearName} TERM {termNumber} BROADSHEET FOR {selectedClass?.toUpperCase()}</p>
                            <p className="text-xs mt-1 font-semibold">SCORE AND POSITION OF STUDENTS</p>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="flex justify-between items-center px-4 py-2 bg-gray-50 border-b text-sm">
                            <div className="flex gap-6">
                                <span><strong>Number on Roll:</strong> {classStudents.length}</span>
                                <span><strong>Term:</strong> {termNumber}</span>
                            </div>
                            <span className="text-gray-600">{today}</span>
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-green-50">
                                    <TableRow>
                                        <TableHead className="w-[200px] sticky left-0 bg-green-50 font-bold border-r">NAME OF STUDENTS</TableHead>
                                        {displaySubjects.map(s => (
                                            <TableHead key={s.id} colSpan={2} className="text-center min-w-[80px] border-x text-xs font-bold">
                                                {s.name}
                                            </TableHead>
                                        ))}
                                        <TableHead className="text-center font-bold min-w-[50px] border-x">TOT</TableHead>
                                        <TableHead className="text-center font-bold min-w-[50px] border-x">AVG</TableHead>
                                        <TableHead className="text-center font-bold min-w-[50px]">POS</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedStudentsByRank.map((student) => {
                                        const total = calculateTotal(student.id);
                                        const avg = calculateAverage(student.id);
                                        const position = getStudentOverallPosition(student.id);
                                        const hasScores = subjects.some(sub => getScore(student.id, sub.id) > 0);

                                        return (
                                            <TableRow
                                                key={student.id}
                                                className={`${!hasScores ? "opacity-50" : ""} ${avg < 50 && avg > 0 ? "bg-red-50" : ""} hover:bg-gray-50 cursor-pointer group transition-colors`}
                                                data-testid={`row-broadsheet-${student.id}`}
                                                onClick={() => handleStudentClick(student)}
                                            >
                                                <TableCell className="sticky left-0 bg-white font-medium border-r">
                                                    {student.name.toUpperCase()}
                                                </TableCell>
                                                {displaySubjects.map(s => {
                                                    const score = getScore(student.id, s.id);
                                                    const grade = score > 0 ? getNumericGrade(score) : "";
                                                    return (
                                                        <>
                                                            <TableCell
                                                                key={`${s.id}-score`}
                                                                className={`text-center border-l ${score === 0 ? 'text-muted-foreground' : score < 50 ? 'text-red-600 font-semibold' : ''}`}
                                                            >
                                                                {score || ""}
                                                            </TableCell>
                                                            <TableCell
                                                                key={`${s.id}-grade`}
                                                                className={`text-center bg-gray-50 text-xs border-r ${score < 50 && score > 0 ? 'text-red-600' : ''}`}
                                                            >
                                                                {grade}
                                                            </TableCell>
                                                        </>
                                                    );
                                                })}
                                                <TableCell className="text-center font-bold border-x">
                                                    {total || ""}
                                                </TableCell>
                                                <TableCell className={`text-center border-x ${avg < 50 && avg > 0 ? 'text-red-600 font-semibold' : ''}`}>
                                                    {avg > 0 ? avg : ""}
                                                </TableCell>
                                                <TableCell className="text-center font-semibold">
                                                    {getPositionSuffix(position)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {classStudents.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={displaySubjects.length * 2 + 4} className="text-center py-8 text-muted-foreground">
                                                No students enrolled in this class
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="p-4 bg-gray-50 border-t flex justify-between items-center flex-wrap gap-4">
                            <div className="text-sm text-gray-600">
                                <span className="font-medium">{studentsWithScores}</span> of {classStudents.length} students have scores entered
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </>
        );
    };

    // ===========================================
    // SUBJECT TEACHER VIEW — Only assigned subjects with rank
    // ===========================================
    const renderSubjectTeacherBroadsheet = () => {
        // Rank students by average of their assigned subjects
        const getSubjectAvg = (studentId: string) => {
            const totalScore = displaySubjects.reduce((sum, s) => sum + getScore(studentId, s.id), 0);
            const subjectsWithScores = displaySubjects.filter(s => getScore(studentId, s.id) > 0).length;
            return subjectsWithScores > 0 ? totalScore / subjectsWithScores : 0;
        };

        const sortedStudents = [...classStudents].sort((a, b) => getSubjectAvg(b.id) - getSubjectAvg(a.id));
        const rankedIds = sortedStudents.filter(s => getSubjectAvg(s.id) > 0).map(s => s.id);

        return (
            <Card className="overflow-hidden border-0 shadow-lg">
                <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-blue-50 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl">{selectedClass} — Subject Broadsheet</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                                <TrendingUp className="h-3.5 w-3.5" />
                                {currentTerm?.name} • {displaySubjects.map(s => s.name).join(", ")} • Ranked by score
                            </CardDescription>
                        </div>
                        <Badge variant="secondary" className="text-sm px-3 py-1">
                            {classStudents.length} Students · {displaySubjects.length} Subject(s)
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loadingScores ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-center space-y-3">
                                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                                <p className="text-sm text-muted-foreground">Loading scores...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/60 hover:bg-muted/60">
                                        <TableHead className="w-[50px] font-bold text-center sticky left-0 bg-muted/60 z-10">Rank</TableHead>
                                        <TableHead className="w-[180px] font-bold sticky left-[50px] bg-muted/60 z-10">Student</TableHead>
                                        {displaySubjects.map(s => (
                                            <TableHead key={s.id} className="text-center min-w-[80px] text-xs font-bold px-2">
                                                {s.name}
                                            </TableHead>
                                        ))}
                                        {displaySubjects.map(s => (
                                            <TableHead key={`${s.id}-grade`} className="text-center min-w-[55px] font-bold bg-green-50">
                                                Grade
                                            </TableHead>
                                        ))}
                                        <TableHead className="text-center font-bold min-w-[55px] bg-amber-50">Remark</TableHead>
                                        <TableHead className="text-center font-bold min-w-[60px] bg-blue-50">Position</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedStudents.map((student) => {
                                        const rankIdx = rankedIds.indexOf(student.id);
                                        const rank = rankIdx >= 0 ? rankIdx + 1 : null;
                                        const isTopThree = rankIdx >= 0 && rankIdx < 3 && getSubjectAvg(student.id) > 0;

                                        return (
                                            <TableRow
                                                key={student.id}
                                                className={`cursor-pointer group transition-colors ${isTopThree ? "bg-yellow-50/50 hover:bg-yellow-50" : "hover:bg-slate-50"}`}
                                                data-testid={`row-broadsheet-${student.id}`}
                                                onClick={() => handleStudentClick(student)}
                                            >
                                                <TableCell className="text-center font-bold sticky left-0 bg-inherit z-10">
                                                    {rank ? (
                                                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold
                                                            ${rankIdx === 0 ? "bg-yellow-400 text-yellow-900" :
                                                                rankIdx === 1 ? "bg-gray-300 text-gray-800" :
                                                                    rankIdx === 2 ? "bg-amber-600 text-white" :
                                                                        "text-muted-foreground"}`}>
                                                            {rank}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="sticky left-[50px] bg-inherit z-10">
                                                    <div className="font-medium text-sm">{student.name}</div>
                                                    <div className="text-xs text-muted-foreground">{student.studentId}</div>
                                                </TableCell>
                                                {displaySubjects.map(s => {
                                                    const score = getScore(student.id, s.id);
                                                    return (
                                                        <TableCell key={s.id} className="text-center text-sm px-2">
                                                            {score > 0 ? (
                                                                <span className={
                                                                    score >= 80 ? "text-green-700 font-semibold" :
                                                                        score >= 60 ? "text-blue-700" :
                                                                            score >= 40 ? "text-amber-700" :
                                                                                "text-red-600"
                                                                }>
                                                                    {score}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground/40">-</span>
                                                            )}
                                                        </TableCell>
                                                    );
                                                })}
                                                {displaySubjects.map(s => {
                                                    const score = getScore(student.id, s.id);
                                                    const grade = score > 0 ? getNumericGrade(score) : "-";
                                                    return (
                                                        <TableCell key={`${s.id}-grade`} className="text-center bg-green-50/50">
                                                            <Badge
                                                                variant={
                                                                    grade === "-" ? "outline" :
                                                                        typeof grade === "number" && grade <= 3 ? "default" :
                                                                            typeof grade === "number" && grade <= 5 ? "secondary" :
                                                                                "destructive"
                                                                }
                                                                className="text-xs font-bold"
                                                            >
                                                                {grade}
                                                            </Badge>
                                                        </TableCell>
                                                    );
                                                })}
                                                <TableCell className="text-center text-xs bg-amber-50/50 text-muted-foreground">
                                                    {displaySubjects.length === 1
                                                        ? getGradeRemark(getScore(student.id, displaySubjects[0].id))
                                                        : getSubjectAvg(student.id) > 0
                                                            ? getGradeRemark(Math.round(getSubjectAvg(student.id)))
                                                            : "-"
                                                    }
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-sm bg-blue-50/50">
                                                    {getPositionSuffix(rank)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {sortedStudents.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={displaySubjects.length * 2 + 4} className="text-center py-16">
                                                <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                                                <p className="text-muted-foreground font-medium">No students found in {selectedClass}</p>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
            {/* Enhanced Header */}
            <header className="h-16 border-b bg-white/90 backdrop-blur-md shadow-sm flex items-center justify-between px-6 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-md">
                        <GraduationCap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Teacher Portal</p>
                        <p className="font-semibold text-foreground leading-tight">{username}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setLocation("/")} data-testid="button-scores">
                        <ClipboardList className="h-4 w-4" />
                        <span className="hidden sm:inline">Score Entry</span>
                    </Button>
                    <Button variant="default" size="sm" className="gap-2" data-testid="button-broadsheet-active">
                        <BarChart3 className="h-4 w-4" />
                        <span className="hidden sm:inline">Broadsheet</span>
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setLocation("/remarks")} data-testid="button-remarks">
                        <MessageSquare className="h-4 w-4" />
                        <span className="hidden sm:inline">Remarks</span>
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setLocation("/profile")} data-testid="button-profile">
                        <User className="h-4 w-4" />
                        <span className="hidden sm:inline">Profile</span>
                    </Button>
                    <div className="w-px h-8 bg-border mx-1" />
                    <Button variant="ghost" size="sm" className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleLogout} data-testid="button-logout">
                        <LogOut className="h-4 w-4" />
                        <span className="hidden sm:inline">Logout</span>
                    </Button>
                </div>
            </header>

            <main className="p-6">
                <div className="max-w-[1400px] mx-auto space-y-6">
                    {/* Page Title */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-serif font-bold text-foreground flex items-center gap-3">
                                <BarChart3 className="h-8 w-8 text-primary" />
                                {isClassTeacherForSelectedClass ? "Class Broadsheet" : "Subject Broadsheet"}
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                {isClassTeacherForSelectedClass
                                    ? "Full performance summary — you are the class teacher"
                                    : "Performance summary for your assigned subjects"
                                }
                            </p>
                            {selectedClass && isClassTeacherForSelectedClass && (
                                <Badge className="mt-2 bg-green-100 text-green-800 border-green-300">
                                    <GraduationCap className="h-3 w-3 mr-1" /> Class Teacher
                                </Badge>
                            )}
                        </div>
                        {selectedClass && selectedTerm && classStudents.length > 0 && (
                            <div className="flex items-center gap-3">
                                <div className="text-right hidden md:block">
                                    <p className="text-2xl font-bold text-primary">{studentsWithScores}/{totalStudentsInClass}</p>
                                    <p className="text-xs text-muted-foreground">Students with scores</p>
                                </div>
                                <div className="flex gap-2">
                                    {isClassTeacherForSelectedClass ? (
                                        <>
                                            <Button
                                                onClick={exportClassTeacherPDF}
                                                className="gap-2"
                                                variant="outline"
                                                data-testid="button-export-pdf"
                                            >
                                                <FileDown className="h-4 w-4" /> Export PDF
                                            </Button>
                                            <Button
                                                onClick={exportClassTeacherExcel}
                                                className="gap-2"
                                                variant="outline"
                                                data-testid="button-export-excel"
                                            >
                                                <FileSpreadsheet className="h-4 w-4" /> Export Excel
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            onClick={exportSubjectTeacherPDF}
                                            className="gap-2 bg-gradient-to-r from-blue-600 to-primary shadow-md hover:shadow-lg transition-all"
                                            data-testid="button-download-pdf"
                                        >
                                            <FileDown className="h-4 w-4" /> Download PDF
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Filters */}
                    <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg">Select Class & Term</CardTitle>
                            <CardDescription>Choose from your assigned classes to view the broadsheet</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4 items-end flex-wrap">
                                <div className="space-y-2 w-full md:w-1/3">
                                    <Label className="text-sm font-medium">Class</Label>
                                    <Select value={selectedClass} onValueChange={(val) => {
                                        setSelectedClass(val);
                                        setScores([]);
                                        setStudents([]);
                                    }}>
                                        <SelectTrigger className="h-11" data-testid="select-broadsheet-class">
                                            <SelectValue placeholder="Select class" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {uniqueClasses.map(cls => (
                                                <SelectItem key={cls} value={cls}>
                                                    {cls}
                                                    {assignments.some(a => a.classLevel === cls && a.isClassTeacher) && " (Class Teacher)"}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 w-full md:w-1/3">
                                    <Label className="text-sm font-medium">Academic Term</Label>
                                    <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                                        <SelectTrigger className="h-11" data-testid="select-broadsheet-term">
                                            <SelectValue placeholder="Select term" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {terms.map(term => (
                                                <SelectItem key={term.id} value={term.id}>
                                                    {term.name} {term.status === "Active" && "✓"}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Broadsheet Table — rendered based on role */}
                    {selectedClass && selectedTerm && (
                        loadingScores ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="text-center space-y-3">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                                    <p className="text-sm text-muted-foreground">Loading scores...</p>
                                </div>
                            </div>
                        ) : isClassTeacherForSelectedClass ? (
                            renderClassTeacherBroadsheet()
                        ) : (
                            renderSubjectTeacherBroadsheet()
                        )
                    )}

                    {/* Empty State */}
                    {assignments.length === 0 && (
                        <Card className="border-0 shadow-md">
                            <CardContent className="py-16 text-center text-muted-foreground">
                                <BookOpen className="h-14 w-14 mx-auto mb-4 opacity-30" />
                                <p className="text-lg font-medium">No classes assigned</p>
                                <p className="text-sm mt-1">Please contact your administrator to assign classes and subjects to you.</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>

            {/* Student Report Preview Dialog */}
            <Dialog open={!!previewStudent} onOpenChange={(open) => !open && setPreviewStudent(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none bg-slate-100 shadow-2xl">
                    <DialogHeader className="p-6 bg-white border-b sticky top-0 z-20 flex flex-row items-center justify-between space-y-0">
                        <div>
                            <DialogTitle className="text-2xl font-serif font-bold text-slate-800">Student Terminal Report</DialogTitle>
                            <DialogDescription>
                                Previewing report for {previewStudent?.name} ({selectedClass})
                            </DialogDescription>
                        </div>
                        <Button
                            className="bg-blue-700 hover:bg-blue-800 text-white gap-2 shadow-lg"
                            onClick={() => printStudentReport(previewStudent)}
                            disabled={loadingReport}
                        >
                            <Printer className="h-4 w-4" /> Print PDF Report
                        </Button>
                    </DialogHeader>

                    {loadingReport ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
                            <p className="text-slate-500 font-medium">Loading report details...</p>
                        </div>
                    ) : (
                        <div className="p-8">
                            <div className="bg-white shadow-xl rounded-lg border border-slate-200 overflow-hidden mx-auto max-w-3xl">
                                {/* Report Header (Similar to printed PDF) */}
                                <div className="p-8 border-b-2 border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        {schoolLogoBase64 ? (
                                            <div className="h-24 w-24 flex-shrink-0 bg-slate-50 rounded-xl p-2 border border-slate-100 flex items-center justify-center">
                                                <img src={schoolLogoBase64} alt="School Badge" className="h-full object-contain" />
                                            </div>
                                        ) : (
                                            <div className="h-24 w-24 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                                                < GraduationCap className="h-10 w-10" />
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 tracking-tight uppercase">University Basic School</h3>
                                            <p className="text-sm text-slate-500 font-medium tracking-wide uppercase mt-1">P.O. BOX 25, WINNEBA, GHANA</p>
                                            <p className="text-xs text-slate-400 mt-0.5 font-semibold">TERMINAL REPORT CARD</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 px-3 py-1 font-bold">
                                            {selectedTerm && terms.find(t => t.id === selectedTerm)?.name}
                                        </Badge>
                                        <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">{new Date().toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <div className="p-8 space-y-8">
                                    {/* Student Info Bar */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Student Name</p>
                                            <p className="text-sm font-bold text-slate-800 line-clamp-1">{previewStudent?.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Student ID</p>
                                            <p className="text-sm font-mono font-bold text-blue-700">{previewStudent?.studentId}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Current Grade</p>
                                            <p className="text-sm font-bold text-slate-800">{selectedClass}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Number on Roll</p>
                                            <p className="text-sm font-bold text-slate-800">{classStudents.length}</p>
                                        </div>
                                    </div>

                                    {/* Academic Scores table */}
                                    <div className="space-y-4">
                                        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 uppercase tracking-wider px-1">
                                            <ClipboardList className="h-4 w-4 text-blue-600" />
                                            Subject Performance
                                        </h4>
                                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                            <Table>
                                                <TableHeader className="bg-slate-50">
                                                    <TableRow>
                                                        <TableHead className="font-bold text-slate-600">SUBJECT</TableHead>
                                                        <TableHead className="text-center font-bold text-slate-600">CLASS (50%)</TableHead>
                                                        <TableHead className="text-center font-bold text-slate-600">EXAM (50%)</TableHead>
                                                        <TableHead className="text-center font-bold text-slate-600">TOTAL</TableHead>
                                                        <TableHead className="text-center font-bold text-slate-600">POS</TableHead>
                                                        <TableHead className="font-bold text-slate-600">REMARK</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {displaySubjects.map(sub => {
                                                        const { classScore, examScore } = getScoreDetails(previewStudent?.id, sub.id);
                                                        const total = classScore + examScore;

                                                        // Per-subject rank
                                                        const classTotalScores = students
                                                            .filter(s => s.grade === selectedClass)
                                                            .map(s => {
                                                                const sScores = scores.filter(sc => sc.studentId === s.id && sc.subjectId === sub.id);
                                                                return sScores.reduce((sum, sc) => sum + sc.totalScore, 0);
                                                            })
                                                            .sort((a, b) => b - a);

                                                        const position = classTotalScores.indexOf(total) + 1;
                                                        const g = getGradeFromScales(total, selectedClass, gradingScales);

                                                        return (
                                                            <TableRow key={sub.id} className="hover:bg-slate-50/50">
                                                                <TableCell className="font-semibold text-slate-700">{sub.name}</TableCell>
                                                                <TableCell className="text-center font-medium text-slate-500">{classScore.toFixed(1)}</TableCell>
                                                                <TableCell className="text-center font-medium text-slate-500">{examScore.toFixed(1)}</TableCell>
                                                                <TableCell className="text-center">
                                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${total >= 80 ? 'bg-green-100 text-green-700' :
                                                                        total >= 60 ? 'bg-blue-100 text-blue-700' :
                                                                            total >= 40 ? 'bg-yellow-100 text-yellow-700' :
                                                                                'bg-red-100 text-red-700'
                                                                        }`}>
                                                                        {total.toFixed(1)}%
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="text-center font-bold text-slate-400">
                                                                    {position}
                                                                </TableCell>
                                                                <TableCell className="text-xs font-bold text-slate-600">{g.description}</TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>

                                    {/* Remarks section */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div className="space-y-3">
                                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 uppercase tracking-wider px-1">
                                                    <TrendingUp className="h-4 w-4 text-blue-600" />
                                                    Overall Summary
                                                </h4>
                                                <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                                                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                                                        <span className="text-sm text-slate-500 font-medium">Average Score</span>
                                                        <span className="text-lg font-bold text-slate-900">{calculateAverage(previewStudent?.id).toFixed(1)}%</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-slate-500 font-medium">Class Position</span>
                                                        <span className="text-lg font-bold text-blue-700">{getStudentOverallPosition(previewStudent?.id)} / {classStudents.length}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl space-y-2">
                                                <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Attendance Profile</p>
                                                <div className="flex items-end gap-1">
                                                    <span className="text-2xl font-bold text-blue-800">{studentTermDetails?.attendance || 0}</span>
                                                    <span className="text-sm text-blue-400 pb-1 font-bold">/ {studentTermDetails?.attendanceTotal || 60} days present</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 uppercase tracking-wider px-1">
                                                <MessageSquare className="h-4 w-4 text-blue-600" />
                                                Class Teacher's Remarks
                                            </h4>
                                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl min-h-[160px] relative">
                                                <p className="text-slate-600 leading-relaxed italic text-sm">
                                                    "{studentTermDetails?.classTeacherRemark || "The teacher has not yet entered remarks for this student for the current term."}"
                                                </p>
                                                <div className="absolute bottom-4 right-6 text-[10px] font-bold text-slate-300 uppercase tracking-widest">Official Report</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 border-t border-slate-100 p-4 text-center">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">University Basic School Winneba • Academic Management System</p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
