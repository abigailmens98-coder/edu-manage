import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    BookOpen, LogOut, User, FileDown, Loader2, FileSpreadsheet,
    MessageSquare, ClipboardList, BarChart3, GraduationCap, TrendingUp, Printer, FileText, Search, Save
} from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { useLocation } from "wouter";
import {
    subjectsApi, academicTermsApi, teacherAssignmentsApi,
    gradingScalesApi, studentsApi, scoresApi, academicYearsApi, assessmentConfigsApi
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { getGradeFromScales, GradingScale, isJHS } from "@/lib/grading";
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
    totalAttendanceDays?: number;
}

interface Score {
    id: string;
    studentId: string;
    subjectId: string;
    classScore: number;
    examScore: number;
    totalScore: number;
}


export default function TeacherBroadsheet() {
    const { username, role, logout, teacherInfo } = useAuth();
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
    const [assessmentConfigs, setAssessmentConfigs] = useState<any[]>([]);

    const [selectedClass, setSelectedClass] = useState("");
    const [selectedTerm, setSelectedTerm] = useState("");

    const [previewStudent, setPreviewStudent] = useState<any | null>(null);
    const [studentTermDetails, setStudentTermDetails] = useState<any | null>(null);
    const [loadingReport, setLoadingReport] = useState(false);
    const [generatingBulk, setGeneratingBulk] = useState(false);
    const [schoolLogoBase64, setSchoolLogoBase64] = useState<string>("");

    const [reportFormData, setReportFormData] = useState({
        attendance: "",
        attendanceTotal: "60",
        attitude: "RESPECTFUL",
        conduct: "GOOD",
        interest: "HOLDS VARIED INTERESTS",
        teacherRemarks: "",
        formMaster: teacherInfo?.name || username || "",
        nextTermBegins: "",
    });


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
            const [subjectsData, termsData, gradingData, yearsData, configData] = await Promise.all([
                subjectsApi.getAll(),
                academicTermsApi.getAll(),
                gradingScalesApi.getAll(),
                academicYearsApi.getAll(),
                assessmentConfigsApi.getAll(),
            ]);

            setSubjects(subjectsData);
            setTerms(termsData);
            setGradingScales(gradingData);
            setAcademicYears(yearsData);
            setAssessmentConfigs(configData);

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

    const getAssessmentWeights = (className: string) => {
        const classNum = parseInt(className.replace(/[^0-9]/g, "") || "0");
        const config = assessmentConfigs.find(c => classNum >= c.minClassLevel && classNum <= c.maxClassLevel);
        return config ? { class: config.classScoreWeight, exam: config.examScoreWeight } : { class: 40, exam: 60 };
    };

    // Helper functions moved to top to avoid ReferenceError
    const getSubjectsForClass = (classLevel: string) => {
        if (!classLevel || !subjects) return [];
        const filtered = subjects.filter(s => Array.isArray(s.classLevels) && s.classLevels.includes(classLevel));
        return filtered.length > 0 ? filtered : subjects;
    };

    const getScore = (studentId: string, subjectId: string) => {
        if (!scores) return 0;
        const score = scores.find(s => s.studentId === studentId && s.subjectId === subjectId);
        return (score && typeof score.totalScore === 'number') ? score.totalScore : 0;
    };

    const getScoreDetails = (studentId: string, subjectId: string) => {
        const score = scores.find(s => s.studentId === studentId && s.subjectId === subjectId);
        return score
            ? { classScore: score.classScore || 0, examScore: score.examScore || 0, total: score.totalScore || 0 }
            : { classScore: 0, examScore: 0, total: 0 };
    };

    const calculateTotal = (studentId: string) => {
        return displaySubjects.reduce((sum: number, sub: any) => sum + getScore(studentId, sub.id), 0);
    };

    const calculateAverage = (studentId: string) => {
        if (displaySubjects.length === 0) return 0;
        const total = displaySubjects.reduce((sum: number, s: any) => sum + getScore(studentId, s.id), 0);
        return parseFloat((total / displaySubjects.length).toFixed(1));
    };

    const getNumericGrade = (score: number): any => {
        if (score === 0) return 0;
        return getGradeFromScales(score, selectedClass, gradingScales).grade;
    };

    const getGradeRemark = (score: number): string => {
        if (score === 0) return "-";
        return getGradeFromScales(score, selectedClass, gradingScales).description;
    };

    const getOverallRankedStudents = () => {
        const classStudents = students.filter(s => s.grade === selectedClass);
        return [...classStudents]
            .filter(s => subjects.some(sub => getScore(s.id, sub.id) > 0))
            .sort((a, b) => calculateAverage(b.id) - calculateAverage(a.id));
    };

    const getStudentOverallPosition = (studentId: string) => {
        const ranked = getOverallRankedStudents();
        const index = ranked.findIndex(s => s.id === studentId);
        return index >= 0 ? index + 1 : null;
    };

    const getSubjectRankedStudents = (subjectId: string) => {
        const classStudents = students.filter(s => s.grade === selectedClass);
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

    const getSubjectPosition = (studentId: string, subjectId: string) => {
        const classScores = students.map(s => {
            const details = getScoreDetails(s.id, subjectId);
            return { id: s.id, total: details.total };
        })
            .filter(s => s.total > 0)
            .sort((a, b) => b.total - a.total);

        const rank = classScores.findIndex(s => s.id === studentId);
        return rank >= 0 ? rank + 1 : null;
    };

    const getGradeInfo = (studentId: string) => {
        const subjectsWithScores = subjects.filter(sub => getScore(studentId, sub.id) > 0);
        if (subjectsWithScores.length === 0) return { grade: "-", description: "-" };
        const total = subjectsWithScores.reduce((sum, sub) => sum + getScore(studentId, sub.id), 0);
        const avg = Math.round(total / subjectsWithScores.length);
        return getGradeFromScales(avg, selectedClass, gradingScales);
    };

    const uniqueClasses = Array.from(new Set(assignments.map(a => a.classLevel))).filter(Boolean);

    // Determine if teacher is class teacher for the selected class
    const isClassTeacherForSelectedClass = assignments.some(
        a => a.classLevel === selectedClass && a.isClassTeacher
    );

    // Get subjects to display based on role
    const getDisplaySubjects = () => {
        if (isClassTeacherForSelectedClass) {
            // Class teacher sees ALL subjects (admin style)
            return subjects;
        }
        // Subject teacher sees ONLY their assigned subjects
        const assignedSubjectIds = assignments
            .filter(a => a.classLevel === selectedClass)
            .map(a => a.subjectId);
        return subjects.filter(s => assignedSubjectIds.includes(s.id));
    };

    const displaySubjects = getDisplaySubjects();

    const classStudents = selectedClass ? students.filter(s => s.grade === selectedClass) : [];
    const totalStudentsInClass = classStudents.length;
    const studentsWithScores = classStudents.filter(s => calculateTotal(s?.id) > 0).length;



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
        doc.text("MINES AND TECHNOLOGY BASIC SCHOOL", 148.5, 18, { align: "center" });

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
            ["MINES AND TECHNOLOGY BASIC SCHOOL"],
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
        doc.text("MINES AND TECHNOLOGY BASIC SCHOOL", doc.internal.pageSize.width / 2, 15, { align: "center" });
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
            if (details) {
                setReportFormData({
                    attendance: String(details.attendance || ""),
                    attendanceTotal: String(details.attendanceTotal || "60"),
                    attitude: details.attitude || "RESPECTFUL",
                    conduct: details.conduct || "GOOD",
                    interest: details.interest || "HOLDS VARIED INTERESTS",
                    teacherRemarks: details.classTeacherRemark || "",
                    formMaster: details.formMaster || "",
                    nextTermBegins: details.nextTermBegins || "",
                });
            } else {
                setReportFormData({
                    attendance: "",
                    attendanceTotal: "60",
                    attitude: "RESPECTFUL",
                    conduct: "GOOD",
                    interest: "HOLDS VARIED INTERESTS",
                    teacherRemarks: "",
                    formMaster: teacherInfo?.name || username || "",
                    nextTermBegins: "",
                });
            }
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

    const generateStudentReportTemplate = (doc: jsPDF, student: any, sDetails: any) => {
        const termData = terms.find(t => t.id === selectedTerm);
        const termName = termData?.name || "";
        const yearData = academicYears.find((y: any) => y.id === termData?.academicYearId);
        const yearName = yearData?.year || "";

        // Add logo if available
        if (schoolLogoBase64) {
            try {
                // Reduced size and slightly shifted to prevent overlap
                doc.addImage(schoolLogoBase64, 'PNG', 20, 10, 22, 22);
            } catch (e) {
                console.error("Could not add logo to PDF", e);
            }
        }

        // Header - Repositioned text slightly
        doc.setFontSize(18);
        doc.setTextColor(30, 64, 175);
        doc.setFont("helvetica", "bold");
        doc.text("MINES AND TECHNOLOGY BASIC SCHOOL", 115, 18, { align: "center" });

        // Footer
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "normal");
        doc.text("Powered by B&P Code Labs | Contact: 0242099920 | Email: B&PCode@gmail.com", 105, pageHeight - 5, { align: "center" });

        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(37, 99, 235);
        doc.text("Knowledge, Truth and Excellence", 105, 24, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("Email: info@minesandtech.edu.gh", 105, 29, { align: "center" });

        doc.setDrawColor(30, 64, 175);
        doc.setLineWidth(1.5);
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

        // Subjects Table - Use all class subjects, not just displaySubjects
        const allClassSubjects = getSubjectsForClass(selectedClass);
        const tableBody = allClassSubjects.map(sub => {
            const { classScore, examScore, total } = getScoreDetails(student.id, sub.id);

            // Per-subject rank
            const classTotalScores = students
                .filter(s => s.grade === selectedClass)
                .map(s => {
                    const sScores = scores.filter(sc => sc.studentId === s.id && sc.subjectId === sub.id);
                    return sScores.reduce((sum, sc) => sum + sc.totalScore, 0);
                })
                .sort((a, b) => b - a);

            const position = classTotalScores.indexOf(total) + 1;
            const remark = total > 0 ? getGradeFromScales(total, selectedClass, gradingScales).description : "-";

            return [
                sub.name.toUpperCase(),
                classScore.toFixed(1),
                examScore.toFixed(1),
                total.toFixed(1),
                getPositionSuffix(position),
                remark.toUpperCase()
            ];
        });

        const weights = getAssessmentWeights(selectedClass);

        autoTable(doc, {
            startY: 75,
            head: [[
                "SUBJECT",
                `CLASS\nSCORE\n${weights.class}%`,
                `EXAMS\nSCORE\n${weights.exam}%`,
                "TOTAL\n(100%)",
                "POS",
                "REMARK"
            ]],
            body: tableBody,
            theme: "grid",
            headStyles: { fillColor: [30, 64, 175], textColor: 255 },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 60 },
                1: { cellWidth: 25 },
                2: { cellWidth: 25 },
                3: { cellWidth: 25 },
                4: { cellWidth: 15 },
                5: { cellWidth: 'auto' }
            }
        });

        // Overall Performance
        const avg = calculateAverage(student.id);
        const overallPos = getStudentOverallPosition(student.id);
        const totalInClass = students.length;

        // Safely determine Y position - handles potential autoTable failures
        const lastY = (doc as any).lastAutoTable?.cursor?.y;
        const finalY = lastY ? lastY + 15 : 150;

        doc.setFont("helvetica", "bold");
        doc.text("OVERALL PERFORMANCE", 20, finalY);
        doc.setFont("helvetica", "normal");
        doc.text(`Average Score: ${avg.toFixed(1)}%`, 20, finalY + 8);
        doc.text(`Overall Position: ${overallPos || "-"} out of ${totalInClass}`, 20, finalY + 14);

        // Remarks
        doc.rect(20, finalY + 25, 170, 40);
        doc.setFont("helvetica", "bold");
        doc.text("CLASS TEACHER'S REMARKS", 25, finalY + 32);
        doc.setFont("helvetica", "italic");
        const remarks = sDetails?.classTeacherRemark || "No remarks entered.";
        const splitRemarks = doc.splitTextToSize(remarks, 160);
        doc.text(splitRemarks, 25, finalY + 42);

        // Signatures
        doc.setFont("helvetica", "bold");
        doc.text("Class Teacher:", 20, finalY + 75);
        doc.setFont("helvetica", "normal");
        doc.text(sDetails?.formMaster || teacherInfo?.name || username || "_________________", 50, finalY + 75);

        doc.setFont("helvetica", "bold");
        doc.text("Head's Signature:", 120, finalY + 75);
        doc.setFont("helvetica", "normal");
        doc.text("_________________", 155, finalY + 75);
    };

    const printStudentReport = async (student: any) => {
        if (!selectedTerm || !student) {
            toast({ title: "Error", description: "Term and Student must be selected.", variant: "destructive" });
            return;
        }

        setLoadingReport(true);
        try {
            const sDetails = await studentsApi.getTermDetails(student.id, selectedTerm);
            const doc = new jsPDF();
            generateStudentReportTemplate(doc, student, sDetails);

            const termData = terms.find(t => t.id === selectedTerm);
            const termName = termData?.name || "Report";

            // Sanitized filename
            const safeStudent = (student.name || "Student").replace(/[^a-zA-Z0-9]/g, "_");
            const safeTerm = termName.replace(/[^a-zA-Z0-9]/g, "_");
            const safeFileName = `Terminal_Report_${safeStudent}_${safeTerm}.pdf`;

            doc.save(safeFileName);
            toast({ title: "Success", description: "Report PDF generated and saved." });
        } catch (err: any) {
            console.error("PDF generation failed:", err);
            toast({
                title: "Error",
                description: "Failed to generate PDF: " + (err.message || "Unknown error"),
                variant: "destructive"
            });
        } finally {
            setLoadingReport(false);
        }
    };

    const exportAllReportsPDF = async () => {
        if (!selectedClass || !selectedTerm) {
            toast({ title: "Selection Required", description: "Select class and term before bulk printing.", variant: "destructive" });
            return;
        }

        setGeneratingBulk(true);
        try {
            const doc = new jsPDF();
            // In this component, 'students' state holds the class students
            const sortedStudentsByRank = [...students].sort((a, b) =>
                calculateAverage(b?.id || "") - calculateAverage(a?.id || "")
            );

            if (sortedStudentsByRank.length === 0) {
                toast({ title: "No Data", description: "No students found in this class.", variant: "destructive" });
                return;
            }

            for (let i = 0; i < sortedStudentsByRank.length; i++) {
                const student = sortedStudentsByRank[i];
                if (i > 0) doc.addPage();

                // Fetch details per student to ensure they have remarks
                try {
                    const sDetails = await studentsApi.getTermDetails(student.id, selectedTerm);
                    generateStudentReportTemplate(doc, student, sDetails);
                } catch (e) {
                    console.error(`Failed to fetch details for ${student.name}`, e);
                    // Continue with empty details if one fails
                    generateStudentReportTemplate(doc, student, null);
                }
            }

            const termData = terms.find(t => t.id === selectedTerm);
            const termName = termData?.name || "Term";
            const safeClass = selectedClass.replace(/[^a-zA-Z0-9]/g, "_");
            const safeTerm = termName.replace(/[^a-zA-Z0-9]/g, "_");

            doc.save(`Bulk_Reports_${safeClass}_${safeTerm}.pdf`);
            toast({ title: "Success", description: `Successfully generated ${sortedStudentsByRank.length} reports.` });
        } catch (err: any) {
            console.error("Bulk PDF export failed:", err);
            toast({
                title: "Error",
                description: "Failed to generate bulk reports: " + (err.message || "Unknown error"),
                variant: "destructive"
            });
        } finally {
            setGeneratingBulk(false);
        }
    };

    const handleSaveReportDetails = async () => {
        if (!previewStudent || !selectedTerm) return;
        try {
            await studentsApi.saveTermDetails(previewStudent.id, {
                studentId: previewStudent.id,
                termId: selectedTerm,
                attendance: parseInt(reportFormData.attendance) || 0,
                attendanceTotal: parseInt(reportFormData.attendanceTotal) || 60,
                attitude: reportFormData.attitude,
                conduct: reportFormData.conduct,
                interest: reportFormData.interest,
                classTeacherRemark: reportFormData.teacherRemarks,
                formMaster: reportFormData.formMaster,
                nextTermBegins: reportFormData.nextTermBegins,
            });
            toast({ title: "Success", description: "Report details saved successfully" });
            fetchStudentScores(previewStudent.id);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to save report details",
                variant: "destructive",
            });
        }
    };

    const handleLogout = () => {
        logout();
        setLocation("/login");
    };

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

    // ===========================================
    // CLASS TEACHER VIEW — Admin-style broadsheet
    // ===========================================
    const renderClassTeacherBroadsheet = () => {
        try {
            const termData = terms.find(t => t.id === selectedTerm);
            const termName = termData?.name || "";
            const termNumber = termData?.termNumber || "";
            const yearData = academicYears.find((y: any) => y.id === termData?.academicYearId);
            const yearName = yearData?.year || "";
            const today = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

            const sortedStudentsByRank = [...classStudents].sort((a, b) =>
                calculateAverage(b?.id || "") - calculateAverage(a?.id || "")
            );

            return (
                <>
                    {/* Admin-style broadsheet header */}
                    <Card className="border-green-200">
                        <CardHeader className="bg-gradient-to-r from-green-700 to-green-600 text-white rounded-t-lg">
                            <div className="text-center">
                                <CardTitle className="text-lg font-bold">MINES AND TECHNOLOGY BASIC SCHOOL</CardTitle>
                                <p className="text-sm mt-1">{yearName} TERM {termNumber} BROADSHEET FOR {(selectedClass || "").toUpperCase()}</p>
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
                                            if (!student) return null;
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
                                                        {(student.name || "Unknown").toUpperCase()}
                                                    </TableCell>
                                                    {displaySubjects.map(s => {
                                                        const score = getScore(student.id, s.id);
                                                        const grade = score > 0 ? getNumericGrade(score) : "";
                                                        return (
                                                            <React.Fragment key={`${student.id}-${s.id}`}>
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
                                                            </React.Fragment>
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
                                    <span className="font-medium">{studentsWithScores}</span> of {totalStudentsInClass} students have scores entered
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            );
        } catch (error) {
            console.error("Rendering error in class broadsheet:", error);
            return <div className="p-8 text-red-600 font-medium border border-red-200 bg-red-50 rounded-lg">An error occurred while loading the broadsheet. Please try selecting a different class or refreshing the page.</div>;
        }
    };

    // ===========================================
    // SUBJECT TEACHER VIEW — Only assigned subjects with rank
    // ===========================================
    const renderSubjectTeacherBroadsheet = () => {
        try {
            // Rank students by average of their assigned subjects
            const getSubjectAvg = (studentId: string) => {
                const totalScore = displaySubjects.reduce((sum, s) => sum + getScore(studentId, s.id), 0);
                const subjectsWithScores = displaySubjects.filter(s => getScore(studentId, s.id) > 0).length;
                return subjectsWithScores > 0 ? totalScore / subjectsWithScores : 0;
            };

            const currentTerm = terms.find(t => t.id === selectedTerm);
            const sortedStudents = [...classStudents].sort((a, b) => getSubjectAvg(b.id) - getSubjectAvg(a.id));
            const rankedIds = sortedStudents.filter(s => getSubjectAvg(s.id) > 0).map(s => s.id);

            return (
                <Card className="overflow-hidden border-0 shadow-lg">
                    <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-blue-50 border-b">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl">{(selectedClass || "").toUpperCase()} — Subject Broadsheet</CardTitle>
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
                                                        <div className="font-medium text-sm">{student.name || "Unknown"}</div>
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
        } catch (error) {
            console.error("Rendering error in subject broadsheet:", error);
            return <div className="p-8 text-red-600 font-medium border border-red-200 bg-red-50 rounded-lg">An error occurred while loading the broadsheet. Please try selecting a different class or refreshing the page.</div>;
        }
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
                                                onClick={exportAllReportsPDF}
                                                className="gap-2 bg-gradient-to-r from-blue-600 to-primary text-white"
                                                variant="default"
                                                disabled={generatingBulk}
                                            >
                                                {generatingBulk ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin" /> Generating Reports...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Printer className="h-4 w-4" /> Print All Reports
                                                    </>
                                                )}
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
                <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0">
                    {previewStudent && (() => {
                        if (loadingReport) {
                            return (
                                <div className="p-20 flex flex-col items-center justify-center space-y-4">
                                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                    <p className="text-muted-foreground animate-pulse">Loading student report...</p>
                                </div>
                            );
                        }

                        const classSubjects = displaySubjects;
                        const studentTotal = classSubjects.reduce((sum: number, sub: any) => sum + getScore(previewStudent.id, sub.id), 0);
                        const subjectsWithScores = classSubjects.filter(sub => getScore(previewStudent.id, sub.id) > 0);
                        const studentAvg = subjectsWithScores.length > 0 ? parseFloat((studentTotal / subjectsWithScores.length).toFixed(1)) : 0;
                        const studentPosition = getStudentOverallPosition(previewStudent.id);
                        const termData = terms.find(t => t.id === selectedTerm);
                        const termName = termData?.name || "";
                        const yearData = academicYears.find((y: any) => y.id === termData?.academicYearId);
                        const yearName = yearData?.year || "";
                        const termAttendance = termData?.totalAttendanceDays || 60;

                        return (
                            <div className="bg-white">
                                {/* School Header with Badge */}
                                <div className="text-center border-b-4 border-blue-600 pb-4 pt-6 px-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-shrink-0 w-20">
                                            <img src="/school-logo.png" alt="School Badge" className="w-20 h-20 object-contain" />
                                        </div>
                                        <div className="flex-1 px-4">
                                            <h1 className="text-xl font-bold text-blue-700 tracking-wide">MINES AND TECHNOLOGY BASIC SCHOOL</h1>
                                            <p className="text-blue-600 italic text-sm">Knowledge, Truth and Excellence</p>
                                        </div>
                                        <div className="flex-shrink-0 w-20" />
                                    </div>
                                    <div className="flex justify-between text-xs mt-2 text-gray-600">
                                        <p>Email: info@minesandtech.edu.gh</p>                                        <div className="text-right">
                                            <p><strong>ADDRESS</strong></p>
                                            <p>P.O. BOX 237, TARKWA</p>
                                            <p>WESTERN REGION, GHANA</p>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <span className="bg-red-600 text-white px-4 py-1 text-sm font-bold rounded">TERMINAL REPORT</span>
                                    </div>
                                </div>

                                {/* Student Info Section */}
                                <div className="px-6 py-4 space-y-2 text-sm border-b">
                                    <div className="flex gap-2">
                                        <span className="font-semibold text-blue-700">Name of Student :</span>
                                        <span className="text-blue-600 font-medium">{previewStudent.name.toUpperCase()}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-semibold text-blue-700">Student ID:</span>
                                        <span className="text-blue-600">{previewStudent.studentId}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <div className="flex gap-2">
                                            <span className="font-semibold text-blue-700">Class:</span>
                                            <span className="text-blue-600">{previewStudent.grade}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-semibold text-slate-700">{yearName || "Academic Year"}</span>
                                            <span className="text-blue-600 font-medium">{termName || "Select Term"}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between">
                                        <div className="flex gap-2">
                                            <span className="font-semibold text-blue-700">Number On Roll :</span>
                                            <span className="text-blue-600">{students.filter(s => s.grade === selectedClass).length}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-semibold text-blue-700">Next Term Begins :</span>
                                            <span className="text-blue-600">
                                                {(() => {
                                                    if (!reportFormData.nextTermBegins) return "TBD";
                                                    try {
                                                        const date = new Date(reportFormData.nextTermBegins);
                                                        if (isNaN(date.getTime())) return "TBD";
                                                        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                                                    } catch (e) {
                                                        return "TBD";
                                                    }
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Score Table */}
                                <div className="px-6 py-4">
                                    <Table className="border-2 border-blue-600">
                                        <TableHeader>
                                            <TableRow className="bg-blue-50">
                                                <TableHead className="border-2 border-blue-600 text-blue-700 font-bold text-center w-[180px]">SUBJECTS</TableHead>
                                                <TableHead className="border-2 border-blue-600 text-blue-700 font-bold text-center w-[80px]">
                                                    <div>CLASS</div>
                                                    <div>SCORE</div>
                                                    <div className="text-xs font-normal">{getAssessmentWeights(selectedClass || "").class} %</div>
                                                </TableHead>
                                                <TableHead className="border-2 border-blue-600 text-blue-700 font-bold text-center w-[80px]">
                                                    <div>EXAMS</div>
                                                    <div>SCORE</div>
                                                    <div className="text-xs font-normal">{getAssessmentWeights(selectedClass || "").exam} %</div>
                                                </TableHead>
                                                <TableHead className="border-2 border-blue-600 text-blue-700 font-bold text-center w-[80px]">
                                                    <div>TOTAL</div>
                                                    <div>(100%)</div>
                                                </TableHead>
                                                <TableHead className="border-2 border-blue-600 text-blue-700 font-bold text-center w-[60px]">GRADES</TableHead>
                                                <TableHead className="border-2 border-blue-600 text-blue-700 font-bold text-center w-[60px]">POS</TableHead>
                                                <TableHead className="border-2 border-blue-600 text-blue-700 font-bold text-center">REMARKS</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {classSubjects.map(s => {
                                                const details = getScoreDetails(previewStudent.id, s.id);
                                                const grade = details.total > 0 ? getNumericGrade(details.total) : "-";
                                                const remark = getGradeRemark(details.total);
                                                return (
                                                    <TableRow key={s.id}>
                                                        <TableCell className="border-2 border-blue-600 text-blue-700 font-medium">{s.name.toUpperCase()}</TableCell>
                                                        <TableCell className="border-2 border-blue-600 text-center text-blue-600">{details.classScore || "-"}</TableCell>
                                                        <TableCell className="border-2 border-blue-600 text-center text-blue-600">{details.examScore || "-"}</TableCell>
                                                        <TableCell className="border-2 border-blue-600 text-center font-semibold text-blue-600">{details.total || "-"}</TableCell>
                                                        <TableCell className="border-2 border-blue-600 text-center font-semibold">{grade}</TableCell>
                                                        <TableCell className="border-2 border-blue-600 text-center font-bold text-blue-700">
                                                            {getPositionSuffix(getSubjectPosition(previewStudent.id, s.id))}
                                                        </TableCell>
                                                        <TableCell className={`border-2 border-blue-600 text-center font-medium ${remark === "Excellent" ? "text-green-600" : remark === "Fail" ? "text-red-600" : "text-blue-600"}`}>
                                                            {remark.toUpperCase()}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            {/* Grand Total Row */}
                                            <TableRow className="bg-blue-50">
                                                <TableCell className="border-2 border-blue-600 font-bold text-blue-700">Grand Total</TableCell>
                                                <TableCell className="border-2 border-blue-600"></TableCell>
                                                <TableCell className="border-2 border-blue-600"></TableCell>
                                                <TableCell className="border-2 border-blue-600 text-center font-bold text-blue-700">{studentTotal}</TableCell>
                                                <TableCell className="border-2 border-blue-600"></TableCell>
                                                <TableCell className="border-2 border-blue-600"></TableCell>
                                                <TableCell className="border-2 border-blue-600"></TableCell>
                                            </TableRow>
                                            {/* Average Row */}
                                            <TableRow className="bg-blue-50">
                                                <TableCell className="border-2 border-blue-600 font-bold text-blue-700">Average</TableCell>
                                                <TableCell className="border-2 border-blue-600"></TableCell>
                                                <TableCell className="border-2 border-blue-600"></TableCell>
                                                <TableCell className="border-2 border-blue-600 text-center font-bold text-blue-700">{studentAvg}</TableCell>
                                                <TableCell className="border-2 border-blue-600"></TableCell>
                                                <TableCell className="border-2 border-blue-600"></TableCell>
                                                <TableCell className="border-2 border-blue-600"></TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Additional Info Section - Editable */}
                                <div className="px-6 py-3 space-y-3 text-sm border-t">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold w-24">Attendance:</span>
                                        <Input
                                            type="number"
                                            className="w-16 h-7 text-center"
                                            value={reportFormData.attendance || String(previewStudent.attendance || termAttendance)}
                                            onChange={(e) => setReportFormData({ ...reportFormData, attendance: e.target.value })}
                                        />
                                        <span>Out Of</span>
                                        <Input
                                            type="number"
                                            className="w-16 h-7 text-center"
                                            value={reportFormData.attendanceTotal}
                                            onChange={(e) => setReportFormData({ ...reportFormData, attendanceTotal: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold w-24">Attitude:</span>
                                        <Input
                                            className="flex-1 h-7"
                                            value={reportFormData.attitude}
                                            onChange={(e) => setReportFormData({ ...reportFormData, attitude: e.target.value })}
                                            placeholder="e.g., RESPECTFUL"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold w-24">Conduct:</span>
                                        <Input
                                            className="flex-1 h-7"
                                            value={reportFormData.conduct}
                                            onChange={(e) => setReportFormData({ ...reportFormData, conduct: e.target.value })}
                                            placeholder="e.g., GOOD"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold w-24">Interest:</span>
                                        <Input
                                            className="flex-1 h-7"
                                            value={reportFormData.interest}
                                            onChange={(e) => setReportFormData({ ...reportFormData, interest: e.target.value })}
                                            placeholder="e.g., HOLDS VARIED INTERESTS"
                                        />
                                    </div>
                                </div>

                                {/* Class Teacher's Remarks - Editable */}
                                <div className="px-6 py-3 space-y-3 text-sm border-t">
                                    <div className="space-y-2">
                                        <span className="font-semibold">Class Teacher's Remarks:</span>
                                        <Textarea
                                            className="w-full h-16 text-sm"
                                            value={reportFormData.teacherRemarks || (
                                                studentAvg >= 80 ? "EXCELLENT PERFORMANCE. KEEP IT UP!" :
                                                    studentAvg >= 70 ? "VERY GOOD WORK. AIM HIGHER!" :
                                                        studentAvg >= 60 ? "GOOD EFFORT. MORE ROOM FOR IMPROVEMENT." :
                                                            studentAvg >= 50 ? "FAIR PERFORMANCE. WORK HARDER!" :
                                                                "NEEDS SIGNIFICANT IMPROVEMENT."
                                            )}
                                            onChange={(e) => setReportFormData({ ...reportFormData, teacherRemarks: e.target.value })}
                                            placeholder="Enter class teacher's remarks..."
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-semibold">Position:</span>
                                        <span className="text-blue-600 font-medium">
                                            {studentPosition != null && studentPosition > 0 ? `${getPositionSuffix(studentPosition)} out of ${students.filter(s => s.grade === selectedClass).length}` : "N/A"}
                                        </span>
                                    </div>
                                </div>

                                {/* Signatures and Next Term */}
                                <div className="px-6 py-4 space-y-3 text-sm border-t">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold w-28 text-slate-700">Class Teacher:</span>
                                        <Input
                                            className="flex-1 h-7 text-xs"
                                            value={reportFormData.formMaster}
                                            onChange={(e) => setReportFormData({ ...reportFormData, formMaster: e.target.value })}
                                            placeholder="Enter teacher name"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold w-28 text-slate-700">Next Term Begins:</span>
                                        <Input
                                            type="date"
                                            className="w-40 h-7 text-xs text-blue-600"
                                            value={reportFormData.nextTermBegins}
                                            onChange={(e) => setReportFormData({ ...reportFormData, nextTermBegins: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Marketing Footer */}
                                <div className="px-6 py-2 text-center border-t bg-slate-50">
                                    <p className="text-[10px] text-gray-400 font-medium">
                                        Powered by B&P Code Labs | Contact: 0242099920 | Email: B&PCode@gmail.com
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-end gap-2 p-4 border-t bg-white sticky bottom-0">
                                    <Button variant="outline" onClick={() => setPreviewStudent(null)}>
                                        Close
                                    </Button>
                                    <Button onClick={handleSaveReportDetails} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                                        <Save className="h-4 w-4" /> Save Information
                                    </Button>
                                    <Button
                                        onClick={() => printStudentReport(previewStudent)}
                                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                                        disabled={loadingReport}
                                    >
                                        {loadingReport ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Printer className="h-4 w-4" />
                                        )}
                                        {loadingReport ? "Generating..." : "Print Report Card"}
                                    </Button>
                                </div>
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    );
}
