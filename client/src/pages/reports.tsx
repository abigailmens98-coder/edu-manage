import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Printer, ArrowLeft, Users, GraduationCap, FileDown, User, FileSpreadsheet, Save, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { studentsApi, subjectsApi, academicYearsApi, academicTermsApi, scoresApi, teacherAssignmentsApi, teachersApi, gradingScalesApi, assessmentConfigsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { sortClassNames } from "@/lib/class-utils";
import { useAuth } from "@/contexts/AuthContext";
import { getGradeFromScales, GradingScale, isJHS } from "@/lib/grading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ReportFormData {
  attendance: string;
  attendanceTotal: string;
  attitude: string;
  conduct: string;
  interest: string;
  teacherRemarks: string;
  formMaster: string;
  nextTermBegins: string;
}

const GRADES = [
  "KG 1", "KG 2",
  "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6",
  "Basic 7", "Basic 8", "Basic 9"
];


interface TeacherAssignment {
  id: string;
  teacherId: string;
  subjectId: string;
  classLevel: string;
  isClassTeacher: boolean;
}

export default function Reports() {
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [gradingScales, setGradingScales] = useState<GradingScale[]>([]);
  const [assessmentConfigs, setAssessmentConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [showStudentReport, setShowStudentReport] = useState<any | null>(null);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [reportFormData, setReportFormData] = useState<ReportFormData>({
    attendance: "",
    attendanceTotal: "60",
    attitude: "RESPECTFUL",
    conduct: "GOOD",
    interest: "HOLDS VARIED INTERESTS",
    teacherRemarks: "",
    formMaster: "",
    nextTermBegins: "",
  });
  const [loadingReportDetails, setLoadingReportDetails] = useState(false);
  const [schoolLogoBase64, setSchoolLogoBase64] = useState<string>("");
  const [generatingBulk, setGeneratingBulk] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { role, userId } = useAuth();

  const isTeacher = role === "teacher";
  const isAdmin = role === "admin";

  useEffect(() => {
    fetchData();
    // Pre-load school logo as base64 for PDF and on-screen display
    const loadLogo = async () => {
      try {
        const response = await fetch("/school-logo.png");
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setSchoolLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } catch (e: any) {
        console.error("Failed to load school logo", e);
      }
    };
    loadLogo();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsData, subjectsData, yearsData, termsData, assignmentsData, gradingData, configData] = await Promise.all([
        studentsApi.getAll(),
        subjectsApi.getAll(),
        academicYearsApi.getAll(),
        academicTermsApi.getAll(),
        teacherAssignmentsApi.getAll(),
        gradingScalesApi.getAll(),
        assessmentConfigsApi.getAll(),
      ]);
      setStudents(studentsData);
      setSubjects(subjectsData);
      setAcademicYears(yearsData);
      setTerms(termsData);
      setTeacherAssignments(assignmentsData);
      setGradingScales(gradingData);
      setAssessmentConfigs(configData);

      const activeYear = yearsData.find((y: any) => y.status === "Active");
      if (activeYear) {
        setSelectedYear(activeYear.id);
      }

      if (isTeacher && userId) {
        const teachers = await teachersApi.getAll();
        const teacher = teachers.find((t: any) => t.userId === userId);
        if (teacher) {
          setTeacherId(teacher.id);
          const assignments = await teacherAssignmentsApi.getByTeacher(teacher.id);
          setTeacherAssignments(assignments);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTerm) {
      loadScores();
    }
  }, [selectedTerm]);

  useEffect(() => {
    if (showStudentReport && selectedTerm) {
      const fetchDetails = async () => {
        setLoadingReportDetails(true);
        try {
          const details = await studentsApi.getTermDetails(showStudentReport.id, selectedTerm);
          if (details) {
            setReportFormData(prev => ({
              ...prev,
              attendance: String(details.attendance !== null ? details.attendance : ""),
              attendanceTotal: String(details.attendanceTotal !== null ? details.attendanceTotal : ""),
              attitude: details.attitude || "RESPECTFUL",
              conduct: details.conduct || "GOOD",
              interest: details.interest || "HOLDS VARIED INTERESTS",
              teacherRemarks: details.classTeacherRemark || prev.teacherRemarks,
            }));
          }
        } catch (err) {
          console.error("Failed to fetch term details", err);
        } finally {
          setLoadingReportDetails(false);
        }
      };
      fetchDetails();
    }
  }, [showStudentReport, selectedTerm]);

  const loadScores = async () => {
    try {
      const scoresData = await scoresApi.getByTerm(selectedTerm);
      setScores(scoresData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load scores",
        variant: "destructive",
      });
    }
  };

  const getNumericGrade = (score: number) => {
    if (score === 0 || !selectedClass) return 0;
    return getGradeFromScales(score, selectedClass, gradingScales).grade;
  };

  const getGradeRemark = (score: number) => {
    if (score === 0 || !selectedClass) return "-";
    return getGradeFromScales(score, selectedClass, gradingScales).description;
  };

  const getAssessmentWeights = (className: string) => {
    const classNum = parseInt(className.replace(/[^0-9]/g, "") || "0");
    const config = assessmentConfigs.find(c => classNum >= c.minClassLevel && classNum <= c.maxClassLevel);
    return config ? { class: config.classScoreWeight, exam: config.examScoreWeight } : { class: 40, exam: 60 };
  };

  const getClassCounts = () => {
    const counts: Record<string, number> = {};
    students.forEach(s => {
      counts[s.grade] = (counts[s.grade] || 0) + 1;
    });
    return counts;
  };

  const classCounts = getClassCounts();

  const getTeacherAssignedClasses = () => {
    if (isTeacher && teacherAssignments.length > 0) {
      return Array.from(new Set(teacherAssignments.map(a => a.classLevel)));
    }
    return null;
  };

  const getTeacherSubjectsForClass = (classLevel: string) => {
    if (isTeacher && teacherAssignments.length > 0) {
      const assignedSubjectIds = teacherAssignments
        .filter(a => a.classLevel === classLevel)
        .map(a => a.subjectId);
      return subjects.filter(s => assignedSubjectIds.includes(s.id));
    }
    return subjects;
  };

  const teacherClasses = getTeacherAssignedClasses();

  const sortedClasses = (() => {
    const allGrades = new Set<string>(GRADES);
    Object.keys(classCounts).forEach(g => allGrades.add(g));
    let classes = Array.from(allGrades);

    if (teacherClasses) {
      classes = classes.filter(c => teacherClasses.includes(c));
    }

    return classes.sort(sortClassNames);
  })();

  const yearTerms = terms.filter(t => t.academicYearId === selectedYear);
  const classStudents = selectedClass ? students.filter(s => s.grade === selectedClass) : [];

  const getSubjectsForClass = (classLevel: string) => {
    const filtered = subjects.filter(s =>
      s.classLevels && s.classLevels.includes(classLevel)
    );
    return filtered.length > 0 ? filtered : subjects;
  };

  const classSubjects = selectedClass ? getSubjectsForClass(selectedClass) : subjects;

  const displaySubjects = selectedClass
    ? (isTeacher ? getTeacherSubjectsForClass(selectedClass) : classSubjects)
    : subjects;

  const allSubjects = classSubjects;

  const getScore = (studentId: string, subjectId: string) => {
    const score = scores.find(s => s.studentId === studentId && s.subjectId === subjectId);
    return score ? score.totalScore : 0;
  };

  const getScoreDetails = (studentId: string, subjectId: string) => {
    const score = scores.find(s => s.studentId === studentId && s.subjectId === subjectId);
    return score ? { classScore: score.classScore || 0, examScore: score.examScore || 0, total: score.totalScore || 0 } : { classScore: 0, examScore: 0, total: 0 };
  };

  const calculateTotal = (studentId: string, subjectsToUse: any[] = subjects) => {
    return subjectsToUse.reduce((sum, sub) => sum + getScore(studentId, sub.id), 0);
  };

  const calculateAverage = (studentId: string, subjectsToUse: any[] = subjects) => {
    if (subjectsToUse.length === 0) return 0;
    const total = subjectsToUse.reduce((sum, s) => sum + getScore(studentId, s.id), 0);
    return parseFloat((total / subjectsToUse.length).toFixed(1));
  };

  const getStudentPassFail = (studentId: string, subjectsToUse: any[] = subjects) => {
    const avg = calculateAverage(studentId, subjectsToUse);
    return avg >= 50 ? "Pass" : "Fail";
  };

  const hasAnyScores = (studentId: string, subjectsToUse: any[] = subjects) => {
    return subjectsToUse.some(s => getScore(studentId, s.id) > 0);
  };

  const getGrade = (total: number, classLevel: string) => {
    return getGradeFromScales(total, classLevel, gradingScales).grade;
  };

  const getFullGradeDetail = (total: number, classLevel: string) => {
    return getGradeFromScales(total, classLevel, gradingScales);
  };

  const getStudentsRankedByAverage = () => {
    return [...classStudents]
      .filter(s => hasAnyScores(s.id, allSubjects))
      .sort((a, b) => calculateAverage(b.id, allSubjects) - calculateAverage(a.id, allSubjects));
  };

  const studentsRankedByAverage = getStudentsRankedByAverage();
  const sortedStudentsByRank = [...classStudents].sort((a, b) => {
    const avgA = calculateAverage(a.id, allSubjects);
    const avgB = calculateAverage(b.id, allSubjects);
    return avgB - avgA;
  });

  const getStudentPosition = (studentId: string) => {
    const ranked = getStudentsRankedByAverage();
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
    const classScores = classStudents.map(s => {
      const details = getScoreDetails(s.id, subjectId);
      return { id: s.id, total: details.total };
    })
      .filter(s => s.total > 0)
      .sort((a, b) => b.total - a.total);

    const rank = classScores.findIndex(s => s.id === studentId);
    return rank >= 0 ? rank + 1 : null;
  };

  const hasScoresEntered = (studentId: string) => {
    return hasAnyScores(studentId, allSubjects);
  };

  const openStudentReport = (student: any) => {
    const studentAvg = calculateAverage(student.id, allSubjects);
    const termAttendance = terms.find(t => t.id === selectedTerm)?.totalAttendanceDays || 60;
    const defaultRemark = studentAvg >= 80 ? "EXCELLENT PERFORMANCE. KEEP IT UP!" :
      studentAvg >= 70 ? "VERY GOOD WORK. AIM HIGHER!" :
        studentAvg >= 60 ? "GOOD EFFORT. MORE ROOM FOR IMPROVEMENT." :
          studentAvg >= 50 ? "FAIR PERFORMANCE. WORK HARDER!" :
            "NEEDS SIGNIFICANT IMPROVEMENT.";

    setReportFormData({
      attendance: String(student.attendance || termAttendance),
      attendanceTotal: String(termAttendance),
      attitude: "RESPECTFUL",
      conduct: "GOOD",
      interest: "HOLDS VARIED INTERESTS",
      teacherRemarks: defaultRemark,
      formMaster: "",
      nextTermBegins: "",
    });
    setShowStudentReport(student);
  };

  const exportBroadsheetPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const yearName = academicYears.find(y => y.id === selectedYear)?.year || "";
    const termData = terms.find(t => t.id === selectedTerm);
    const termName = termData?.name || "";
    const termNumber = termData?.termNumber || "";
    const today = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    doc.setFillColor(0, 100, 0);
    doc.rect(0, 0, 297, 8, "F");

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 100, 0);
    doc.text("UNIVERSITY OF MINES AND TECHNOLOGY BASIC SCHOOL", 148.5, 18, { align: "center" });

    doc.setFontSize(11);
    doc.text("UBaS", 148.5, 23, { align: "center" });

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`${yearName} TERM ${termNumber}    BROADSHEET FOR    ${selectedClass?.toUpperCase()}`, 148.5, 30, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("SCORE AND POSITION OF STUDENTS", 148.5, 37, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    // Number on Roll and other info shifted down to accommodate larger badge area
    doc.text(`Number on Roll: ${classStudents.length}`, 14, 55);
    doc.text(`Term: ${termNumber}`, 70, 55);
    doc.text(today, 250, 55);

    // Watermark Helper
    const drawWatermark = (pDoc: jsPDF, size: number) => {
      if (schoolLogoBase64) {
        try {
          const pageWidth = pDoc.internal.pageSize.getWidth();
          const pageHeight = pDoc.internal.pageSize.getHeight();
          const x = (pageWidth - size) / 2;
          const y = (pageHeight - size) / 2;
          pDoc.saveGraphicsState();
          // @ts-ignore
          const gState = new (pDoc as any).GState({ opacity: 0.15 });
          pDoc.setGState(gState);
          pDoc.addImage(schoolLogoBase64, "PNG", x, y, size, size);
          pDoc.restoreGraphicsState();
        } catch (e) {
          console.error("Watermark failed", e);
        }
      }
    };

    // Draw on first page
    drawWatermark(doc, 130);

    // Set up hook for background drawing on subsequent pages
    if (!(doc as any)._watermarkHookAttached) {
      const originalAddPage = doc.addPage.bind(doc);
      doc.addPage = function () {
        const result = originalAddPage.apply(this, arguments as any);
        drawWatermark(this as any, 130);
        return result;
      };
      (doc as any)._watermarkHookAttached = true;
    }

    // Logo Area
    if (schoolLogoBase64) {
      try {
        doc.addImage(schoolLogoBase64, "PNG", 14, 10, 35, 35);
      } catch (e: any) {
        console.error("Failed to add school logo to broadsheet PDF", e);
      }
    }

    const subjectHeaders = displaySubjects.flatMap(s => [s.name, ""]);

    const tableHead = [
      ["NAME OF STUDENTS", ...subjectHeaders, "TOT", "AVG", "POS"]
    ];

    const sortedStudents = [...classStudents].sort((a, b) => {
      const avgA = calculateAverage(a.id, allSubjects);
      const avgB = calculateAverage(b.id, allSubjects);
      return avgB - avgA;
    });

    const tableBody = sortedStudents.map((student) => {
      const total = calculateTotal(student.id, allSubjects);
      const avg = calculateAverage(student.id, allSubjects);
      const position = getStudentPosition(student.id);
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
      subjectColStyles[gradeCol] = { cellWidth: 6, halign: "center" }; // Transparent
    });

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 60,
      theme: "grid",
      styles: { fontSize: 6, cellPadding: 1, fillColor: undefined }, // No global fill
      headStyles: {
        fillColor: undefined, // Transparent
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
              data.cell.styles.fontSize = 5;
            }
          }
          const cellValue = data.cell.raw;
          if (cellValue === "Fail" || cellValue === 0) {
            data.cell.styles.textColor = [200, 0, 0];
          }
        }
      },
      // didDrawPage removed from here as we use addPage hook for background drawing
    });

    doc.save(`Broadsheet_${selectedClass}_${termName.replace(/\s+/g, "_")}.pdf`);

    toast({
      title: "Success",
      description: "Broadsheet PDF exported successfully",
    });
  };

  const exportBroadsheetExcel = () => {
    const yearName = academicYears.find(y => y.id === selectedYear)?.year || "";
    const termData = terms.find(t => t.id === selectedTerm);
    const termName = termData?.name || "";

    const headers = [
      "Position",
      "Student Name",
      "Student ID",
      ...displaySubjects.flatMap(s => [`${s.name} Score`, `${s.name} Grade`]),
      "Total",
      "Average",
      "Status"
    ];

    const sortedStudents = [...classStudents].sort((a, b) => {
      return calculateAverage(b.id, allSubjects) - calculateAverage(a.id, allSubjects);
    });

    const data = sortedStudents.map((student) => {
      const total = calculateTotal(student.id, allSubjects);
      const avg = calculateAverage(student.id, allSubjects);
      const position = getStudentPosition(student.id);
      const status = getStudentPassFail(student.id, allSubjects);

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
        status
      ];
    });

    const wsData = [
      ["UNIVERSITY OF MINES AND TECHNOLOGY BASIC SCHOOL"],
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

    toast({
      title: "Success",
      description: "Broadsheet Excel exported successfully",
    });
  };

  const generateReportPDF = (doc: jsPDF, student: any, studentTermDetails: any) => {
    const yearName = academicYears.find(y => y.id === selectedYear)?.year || "";
    const termData = terms.find(t => t.id === selectedTerm);
    const termName = termData?.name || "";
    const termAttendance = termData?.totalAttendanceDays || 60;
    const position = getStudentPosition(student.id);
    const total = calculateTotal(student.id, allSubjects);
    const avg = calculateAverage(student.id, allSubjects);

    // Set blue color for headers
    const blueColor: [number, number, number] = [30, 64, 175];
    const lightBlue: [number, number, number] = [235, 245, 255];

    // Watermark Helper
    const drawWatermark = (pDoc: jsPDF, size: number) => {
      if (schoolLogoBase64) {
        try {
          const pageWidth = pDoc.internal.pageSize.getWidth();
          const pageHeight = pDoc.internal.pageSize.getHeight();
          const x = (pageWidth - size) / 2;
          const y = (pageHeight - size) / 2;
          pDoc.saveGraphicsState();
          // @ts-ignore
          const gState = new (pDoc as any).GState({ opacity: 0.15 });
          pDoc.setGState(gState);
          pDoc.addImage(schoolLogoBase64, "PNG", x, y, size, size);
          pDoc.restoreGraphicsState();
        } catch (e) {
          console.error("Watermark failed", e);
        }
      }
    };

    // Draw on first page
    drawWatermark(doc, 120);

    // Set up hook for background drawing on subsequent pages
    // Use a flag to prevent multiple hook attachments if the function is called sequentially on the same doc
    if (!(doc as any)._watermarkHookAttached) {
      const originalAddPage = doc.addPage.bind(doc);
      doc.addPage = function () {
        const result = originalAddPage.apply(this, arguments as any);
        drawWatermark(this as any, 120);
        return result;
      };
      (doc as any)._watermarkHookAttached = true;
    }

    // Logo Area
    if (schoolLogoBase64) {
      try {
        // Enlarged Logo
        doc.addImage(schoolLogoBase64, "PNG", 14, 10, 35, 35);
      } catch (e: any) {
        console.error("Failed to add school logo to PDF", e);
      }
    }

    // School Header - Repositioned text slightly
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...blueColor);
    doc.text("UNIVERSITY OF MINES AND TECHNOLOGY BASIC SCHOOL", 115, 18, { align: "center" });

    doc.setFontSize(11);
    doc.text("UBaS", 115, 23, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Knowledge, Truth and Excellence", 115, 28, { align: "center" });

    // Contact info
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);

    doc.text("ADDRESS", 160, 31);
    doc.text("P.O. BOX 237, TARKWA", 160, 36);
    doc.text("WESTERN REGION, GHANA", 160, 41);

    // Blue line separator
    doc.setDrawColor(...blueColor);
    doc.setLineWidth(1.5);
    doc.line(10, 55, 200, 55);

    // Terminal Report Badge
    doc.setFillColor(220, 38, 38);
    doc.roundedRect(80, 58, 50, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("TERMINAL REPORT", 105, 64, { align: "center" });

    // Student Info Section - Shifted down
    doc.setTextColor(...blueColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Name of Student :", 14, 78);
    doc.setFont("helvetica", "normal");
    doc.text(student.name.toUpperCase(), 52, 78);

    doc.setFont("helvetica", "bold");
    doc.text("Student ID:", 14, 85);
    doc.setFont("helvetica", "normal");
    doc.text(student.studentId, 42, 85);

    doc.setFont("helvetica", "bold");
    doc.text("Class:", 14, 92);
    doc.setFont("helvetica", "normal");
    doc.text(student.grade, 30, 92);

    // Right side info - Shifted down
    doc.setFont("helvetica", "bold");
    doc.text(`${yearName}  ${termName}`, 160, 78);

    doc.setFont("helvetica", "bold");
    doc.text("Number On Roll :", 120, 85);
    doc.setFont("helvetica", "normal");
    doc.text(String(classStudents.length), 160, 85);

    doc.setFont("helvetica", "bold");
    doc.text("Next Term Begins :", 120, 92);
    doc.setFont("helvetica", "normal");
    const nextTermBegins = studentTermDetails?.nextTermBegins
      ? new Date(studentTermDetails.nextTermBegins).toLocaleDateString('en-GB')
      : "TBD";
    doc.text(nextTermBegins, 165, 92);

    // Score Table
    const weights = getAssessmentWeights(student.grade);
    const tableHead = [[
      "SUBJECTS",
      `CLASS\nSCORE\n${weights.class}%`,
      `EXAMS\nSCORE\n${weights.exam}%`,
      "TOTAL\n(100%)",
      "POS",
      "GRADES",
      "REMARKS"
    ]];
    const tableBody = allSubjects.map(s => {
      const scoreData = scores.find(sc => sc.studentId === student.id && sc.subjectId === s.id);
      const classScore = scoreData?.classScore || 0;
      const examScore = scoreData?.examScore || 0;
      const totalScore = classScore + examScore;
      const grade = totalScore > 0 ? getNumericGrade(totalScore) : "-";
      const subjectPos = getSubjectPosition(student.id, s.id);
      const remark = totalScore > 0 ? getGradeFromScales(totalScore, student.grade, gradingScales).description : "-";
      return [s.name.toUpperCase(), classScore || "-", examScore || "-", totalScore || "-", getPositionSuffix(subjectPos), grade, remark.toUpperCase()];
    });

    // Add Grand Total and Average rows
    tableBody.push(["Grand Total", "", "", total, "", "", ""]);
    tableBody.push(["Average", "", "", avg, "", "", ""]);

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 98,
      theme: 'grid',
      styles: {
        fontSize: 8,
        textColor: blueColor,
        lineColor: blueColor,
        lineWidth: 0.3,
        halign: 'center',
        valign: 'middle',
        fillColor: undefined // Transparent
      },
      headStyles: {
        fillColor: undefined, // Transparent
        textColor: blueColor,
        fontStyle: 'bold',
        lineColor: blueColor,
        lineWidth: 0.5
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 50 },
        1: { cellWidth: 20 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { cellWidth: 15 },
        5: { cellWidth: 15 },
        6: { cellWidth: 'auto' }
      },
      didParseCell: (data) => {
        // Style Grand Total and Average rows
        if (data.row.index >= tableBody.length - 2 && data.section === 'body') {
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 180;

    // Additional Info - using term details
    const attendanceVal = String(studentTermDetails?.attendance !== undefined ? studentTermDetails.attendance : (student.attendance || termAttendance));
    const attendanceTotalVal = String(studentTermDetails?.attendanceTotal || "60");
    const attitudeVal = studentTermDetails?.attitude || "RESPECTFUL";
    const conductVal = studentTermDetails?.conduct || "GOOD";
    const interestVal = studentTermDetails?.interest || "HOLDS VARIED INTERESTS";
    const formMasterVal = studentTermDetails?.formMaster || "_________________________";
    const nextTermVal = studentTermDetails?.nextTermBegins ? new Date(studentTermDetails.nextTermBegins).toLocaleDateString('en-GB') : "TBD";

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Attendance: `, 14, finalY + 10);
    doc.setFont("helvetica", "normal");
    doc.text(`${attendanceVal} Out Of ${attendanceTotalVal}`, 38, finalY + 10);

    doc.setFont("helvetica", "bold");
    doc.text("Attitude:", 14, finalY + 17);
    doc.setFont("helvetica", "italic");
    doc.text(attitudeVal.toUpperCase(), 35, finalY + 17);

    doc.setFont("helvetica", "bold");
    doc.text("Conduct:", 14, finalY + 24);
    doc.setFont("helvetica", "italic");
    doc.text(conductVal.toUpperCase(), 35, finalY + 24);

    doc.setFont("helvetica", "bold");
    doc.text("Interest:", 14, finalY + 31);
    doc.setFont("helvetica", "italic");
    doc.text(interestVal.toUpperCase(), 35, finalY + 31);

    // Class Teacher's Remarks - using term details or auto-generated
    const defaultRemark = avg >= 80 ? "EXCELLENT PERFORMANCE. KEEP IT UP!" :
      avg >= 70 ? "VERY GOOD WORK. AIM HIGHER!" :
        avg >= 60 ? "GOOD EFFORT. MORE ROOM FOR IMPROVEMENT." :
          avg >= 50 ? "FAIR PERFORMANCE. WORK HARDER!" :
            "NEEDS SIGNIFICANT IMPROVEMENT.";
    const teacherRemark = studentTermDetails?.classTeacherRemark || defaultRemark;

    doc.setFont("helvetica", "bold");
    doc.text("Class Teacher's Remarks:", 14, finalY + 42);
    doc.setFont("helvetica", "italic");
    const remarkLines = doc.splitTextToSize(teacherRemark, 130);
    doc.text(remarkLines, 60, finalY + 42);

    doc.setFont("helvetica", "bold");
    doc.text("Position:", 14, finalY + 52);
    doc.setTextColor(...blueColor);
    const positionText = position != null && position > 0 ? `${getPositionSuffix(position)} out of ${classStudents.length}` : "N/A";
    doc.text(positionText, 35, finalY + 52);

    // Form Master
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Form Master:", 14, finalY + 63);
    doc.setFont("helvetica", "normal");
    doc.text(formMasterVal, 40, finalY + 63);

    // Next Term Begins
    doc.setFont("helvetica", "bold");
    doc.text("Next Term Begins:", 100, finalY + 63);
    doc.setFont("helvetica", "normal");
    doc.text(nextTermVal, 145, finalY + 63);

    // Head's Signature
    doc.setFont("helvetica", "bold");
    doc.text("Head's Signature:", 14, finalY + 73);
    doc.setFont("helvetica", "normal");
    doc.text("_________________________", 50, finalY + 73);

    // Marketing Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("Powered by B&P Code Labs | Contact: 0242099920", 105, pageHeight - 5, { align: "center" });
  };

  const printStudentReport = async (student: any) => {
    if (!selectedTerm) {
      toast({
        title: "Selection Required",
        description: "Please select a term before printing.",
        variant: "destructive"
      });
      return;
    }

    setLoadingReport(true);
    try {
      const doc = new jsPDF();
      const termDetails = await studentsApi.getTermDetails(student.id, selectedTerm);
      generateReportPDF(doc, student, termDetails);

      const termName = terms.find(t => t.id === selectedTerm)?.name || "Report";
      const safeName = student.name.replace(/[^a-zA-Z0-9]/g, "_");
      const safeTerm = termName.replace(/[^a-zA-Z0-9]/g, "_");

      doc.save(`Terminal_Report_${safeName}_${safeTerm}.pdf`);

      toast({
        title: "Success",
        description: "Terminal report PDF exported successfully",
      });
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast({
        title: "Error",
        description: "Failed to generate report: " + (err.message || "Unknown error"),
        variant: "destructive"
      });
    } finally {
      setLoadingReport(false);
    }
  };

  const printBulkReports = async () => {
    if (!selectedClass || !selectedTerm) return;

    setGeneratingBulk(true);
    try {
      const doc = new jsPDF();
      const termName = terms.find(t => t.id === selectedTerm)?.name || "Bulk";

      // Process students one by one
      for (let i = 0; i < classStudents.length; i++) {
        const student = classStudents[i];

        // Add new page if not the first student
        if (i > 0) {
          doc.addPage();
        }

        // Fetch term details for this student
        const termDetails = await studentsApi.getTermDetails(student.id, selectedTerm);
        generateReportPDF(doc, student, termDetails);
      }

      const safeClass = selectedClass.replace(/[^a-zA-Z0-9]/g, "_");
      const safeTerm = termName.replace(/[^a-zA-Z0-9]/g, "_");
      doc.save(`Bulk_Reports_${safeClass}_${safeTerm}.pdf`);

      toast({
        title: "Success",
        description: `Bulk reports for ${classStudents.length} students exported successfully`,
      });
    } catch (error: any) {
      console.error("Bulk export failed", error);
      toast({
        title: "Error",
        description: "Failed to generate bulk reports: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
    } finally {
      setGeneratingBulk(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!selectedClass) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Reports & Broadsheet</h1>
          <p className="text-muted-foreground mt-1">
            {isTeacher
              ? "View reports and broadsheets for your assigned subjects."
              : "Select a class to view student reports and generate broadsheets."
            }
          </p>
        </div>

        {isTeacher && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 ml-2">
              You can view broadsheets for your assigned subjects only.
              {teacherAssignments.length > 0 && ` Showing ${sortedClasses.length} class(es) with ${new Set(teacherAssignments.map(a => a.subjectId)).size} subject(s).`}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Select Academic Year</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger data-testid="select-academic-year">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map(y => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.year} {y.status === "Active" && "(Active)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedYear && yearTerms.length > 0 && (
              <div className="mt-6">
                <Label className="mb-3 block">Academic Terms</Label>
                <div className="flex gap-3 flex-wrap">
                  {yearTerms.map(term => (
                    <Button
                      key={term.id}
                      variant={selectedTerm === term.id ? "default" : "outline"}
                      className={`${term.status === "Inactive" ? "opacity-50" : ""
                        } ${selectedTerm === term.id ? "" : term.status === "Active" ? "border-green-500 text-green-700" : ""}`}
                      onClick={() => setSelectedTerm(term.id)}
                      data-testid={`button-term-${term.id}`}
                    >
                      {term.name}
                      {term.status === "Active" && (
                        <Badge className="ml-2 bg-green-500">Active</Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedClasses.map((grade) => {
            const count = classCounts[grade] || 0;
            const isKG = grade.startsWith("KG");
            const assignedSubjectsCount = isTeacher
              ? teacherAssignments.filter(a => a.classLevel === grade).length
              : subjects.length;

            return (
              <Card
                key={grade}
                className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${isKG ? 'border-l-4 border-l-pink-500' : 'border-l-4 border-l-blue-500'
                  } ${!selectedTerm ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => selectedTerm && setSelectedClass(grade)}
                data-testid={`card-report-class-${grade.replace(/\s+/g, "-")}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{grade}</CardTitle>
                    <GraduationCap className={`h-5 w-5 ${isKG ? 'text-pink-500' : 'text-blue-500'}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{count}</span>
                    <span className="text-muted-foreground text-sm">
                      {count === 1 ? 'student' : 'students'}
                    </span>
                  </div>
                  {isTeacher && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {assignedSubjectsCount} subject(s) assigned
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!selectedTerm && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="py-4 text-center text-yellow-800">
              Please select an academic year and term above to view class reports.
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const termData = terms.find(t => t.id === selectedTerm);
  const termName = termData?.name || "";
  const termNumber = termData?.termNumber || "";
  const yearName = academicYears.find(y => y.id === selectedYear)?.year || "";
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedClass(null)}
            data-testid="button-back-to-classes"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">{selectedClass} Broadsheet</h1>
            <p className="text-muted-foreground mt-1">{yearName} - {termName}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            className="gap-2"
            onClick={exportBroadsheetPDF}
            disabled={classStudents.length === 0}
            data-testid="button-export-pdf"
          >
            <FileDown className="h-4 w-4" /> Export PDF
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={exportBroadsheetExcel}
            disabled={classStudents.length === 0}
            data-testid="button-export-excel"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </Button>
          <Button
            variant="default"
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            onClick={printBulkReports}
            disabled={classStudents.length === 0 || generatingBulk}
            data-testid="button-bulk-reports"
          >
            {generatingBulk ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            Bulk Reports
          </Button>
        </div>
      </div>

      {isTeacher && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 ml-2">
            Showing {displaySubjects.length} subject(s) assigned to you. Admins see all subjects.
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-green-200">
        <CardHeader className="bg-gradient-to-r from-green-700 to-green-600 text-white rounded-t-lg">
          <div className="text-center">
            <CardTitle className="text-lg font-bold">UNIVERSITY OF MINES AND TECHNOLOGY BASIC SCHOOL</CardTitle>
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

          <div className="overflow-x-auto" ref={printRef}>
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
                  const total = calculateTotal(student.id, allSubjects);
                  const avg = calculateAverage(student.id, allSubjects);
                  const position = getStudentPosition(student.id);
                  const hasScores = hasScoresEntered(student.id);
                  const status = getStudentPassFail(student.id, allSubjects);

                  return (
                    <TableRow
                      key={student.id}
                      className={`${!hasScores ? "opacity-50" : ""} ${status === "Fail" && hasScores ? "bg-red-50" : ""} hover:bg-gray-50 cursor-pointer`}
                      onClick={() => hasScores && openStudentReport(student)}
                      data-testid={`row-report-${student.id}`}
                    >
                      <TableCell className="sticky left-0 bg-white font-medium border-r" data-testid={`text-name-${student.id}`}>
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
                              data-testid={`text-score-${student.id}-${s.id}`}
                            >
                              {score || ""}
                            </TableCell>
                            <TableCell
                              key={`${s.id}-grade`}
                              className={`text-center bg-gray-50 text-xs border-r ${score < 50 && score > 0 ? 'text-red-600' : ''}`}
                              data-testid={`text-grade-${student.id}-${s.id}`}
                            >
                              {grade}
                            </TableCell>
                          </>
                        );
                      })}
                      <TableCell className="text-center font-bold border-x" data-testid={`text-total-${student.id}`}>
                        {total || ""}
                      </TableCell>
                      <TableCell className={`text-center border-x ${avg < 50 && avg > 0 ? 'text-red-600 font-semibold' : ''}`} data-testid={`text-avg-${student.id}`}>
                        {avg > 0 ? avg : ""}
                      </TableCell>
                      <TableCell className="text-center font-semibold" data-testid={`text-position-${student.id}`}>
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
              <span className="font-medium">{studentsRankedByAverage.length}</span> of {classStudents.length} students have scores entered
            </div>
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger className="w-40" data-testid="select-term-inline">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearTerms.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} {t.status === "Active" && "(Active)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grading Scale Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {gradingScales
              .filter(s => s.type === (isJHS(selectedClass) ? "jhs" : "primary"))
              .sort((a, b) => b.minScore - a.minScore)
              .map((g) => (
                <div key={g.id} className="p-3 rounded border bg-blue-50 border-blue-200">
                  <div className="font-bold text-lg text-blue-800">{g.grade}</div>
                  <div className="text-xs text-blue-600 font-semibold">{g.minScore}-{g.maxScore}%</div>
                  <div className="text-xs font-medium text-gray-700">{g.description.toUpperCase()}</div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!showStudentReport} onOpenChange={() => setShowStudentReport(null)}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0">
          {showStudentReport && (() => {
            const studentTotal = calculateTotal(showStudentReport.id, allSubjects);
            const studentAvg = calculateAverage(showStudentReport.id, allSubjects);
            const studentPosition = getStudentPosition(showStudentReport.id);
            const termAttendance = termData?.totalAttendanceDays || 60;

            return (
              <div className="bg-white">
                {/* School Header with Badge */}
                <div className="text-center border-b-4 border-blue-600 pb-4 pt-6 px-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-shrink-0 p-0.5">
                      <img src="/school-logo.png" alt="School Badge" className="w-24 h-24 object-contain" />
                    </div>
                    <div className="flex-1 px-4">
                      <h1 className="text-xl font-bold text-blue-700 tracking-wide">UNIVERSITY OF MINES AND TECHNOLOGY BASIC SCHOOL</h1>
                      <h2 className="text-lg font-bold text-blue-600">UBaS</h2>
                      <p className="text-blue-600 italic text-sm">Knowledge, Truth and Excellence</p>
                    </div>
                    <div className="flex-shrink-0 w-24 text-right text-xs text-gray-600">
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
                    <span className="text-blue-600 font-medium">{showStudentReport.name.toUpperCase()}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold text-blue-700">Student ID:</span>
                    <span className="text-blue-600">{showStudentReport.studentId}</span>
                  </div>
                  <div className="flex justify-between">
                    <div className="flex gap-2">
                      <span className="font-semibold text-blue-700">Class:</span>
                      <span className="text-blue-600">{showStudentReport.grade}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold">{yearName}</span>
                      <span className="text-blue-600 font-medium">{termName}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <div className="flex gap-2">
                      <span className="font-semibold text-blue-700">Number On Roll :</span>
                      <span className="text-blue-600">{classStudents.length}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-blue-700">Next Term Begins :</span>
                      <span className="text-blue-600">
                        {reportFormData.nextTermBegins
                          ? new Date(reportFormData.nextTermBegins).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                          : "TBD"}
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
                          <div className="text-xs font-normal">40 %</div>
                        </TableHead>
                        <TableHead className="border-2 border-blue-600 text-blue-700 font-bold text-center w-[80px]">
                          <div>EXAMS</div>
                          <div>SCORE</div>
                          <div className="text-xs font-normal">60 %</div>
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
                      {allSubjects.map(s => {
                        const details = getScoreDetails(showStudentReport.id, s.id);
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
                              {getPositionSuffix(getSubjectPosition(showStudentReport.id, s.id))}
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
                      value={reportFormData.attendance || String(showStudentReport.attendance || termAttendance)}
                      onChange={(e) => setReportFormData({ ...reportFormData, attendance: e.target.value })}
                      data-testid="input-attendance"
                    />
                    <span>Out Of</span>
                    <Input
                      type="number"
                      className="w-16 h-7 text-center"
                      value={reportFormData.attendanceTotal}
                      onChange={(e) => setReportFormData({ ...reportFormData, attendanceTotal: e.target.value })}
                      data-testid="input-attendance-total"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Attitude</Label>
                      <Select
                        value={reportFormData.attitude}
                        onValueChange={(val) => setReportFormData({ ...reportFormData, attitude: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Attitude" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RESPECTFUL">Respectful</SelectItem>
                          <SelectItem value="OBEDIENT">Obedient</SelectItem>
                          <SelectItem value="POLITE">Polite</SelectItem>
                          <SelectItem value="MODERATE">Moderate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Conduct</Label>
                      <Select
                        value={reportFormData.conduct}
                        onValueChange={(val) => setReportFormData({ ...reportFormData, conduct: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Conduct" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Behaves well in class.">Behaves well in class.</SelectItem>
                          <SelectItem value="Conduct is improving.">Conduct is improving.</SelectItem>
                          <SelectItem value="Conduct needs improvement.">Conduct needs improvement.</SelectItem>
                          <SelectItem value="Needs to be more disciplined in class.">Needs to be more disciplined in class.</SelectItem>
                          <SelectItem value="EXCELLENT">Excellent</SelectItem>
                          <SelectItem value="GOOD">Good</SelectItem>
                          <SelectItem value="SATISFACTORY">Satisfactory</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label>Interest</Label>
                      <Select
                        value={reportFormData.interest}
                        onValueChange={(val) => setReportFormData({ ...reportFormData, interest: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Interest" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Art work">Art work</SelectItem>
                          <SelectItem value="Reading">Reading</SelectItem>
                          <SelectItem value="Sports">Sports</SelectItem>
                          <SelectItem value="VERY KEEN">Very Keen</SelectItem>
                          <SelectItem value="KEEN">Keen</SelectItem>
                          <SelectItem value="MODERATE">Moderate</SelectItem>
                          <SelectItem value="MINIMAL">Minimal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                      data-testid="input-teacher-remarks"
                    />
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold">Position:</span>
                    <span className="text-blue-600 font-medium">
                      {studentPosition != null && studentPosition > 0 ? `${getPositionSuffix(studentPosition)} out of ${classStudents.length}` : "N/A"}
                    </span>
                  </div>
                </div>

                {/* Signatures Section - Editable Form Master */}
                <div className="px-6 py-4 space-y-3 text-sm border-t">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold w-28">Class Teacher:</span>
                    <Input
                      className="flex-1 h-7"
                      value={reportFormData.formMaster}
                      onChange={(e) => setReportFormData({ ...reportFormData, formMaster: e.target.value })}
                      placeholder="Enter form master name"
                      data-testid="input-form-master"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold w-28">Next Term Begins:</span>
                    <Input
                      type="date"
                      className="w-40 h-7"
                      value={reportFormData.nextTermBegins}
                      onChange={(e) => setReportFormData({ ...reportFormData, nextTermBegins: e.target.value })}
                      data-testid="input-next-term"
                    />
                  </div>

                </div>

                {/* Student Bill Section - Editable */}

                {/* Marketing Footer */}
                <div className="px-6 py-2 text-center border-t bg-slate-50">
                  <p className="text-[10px] text-gray-400 font-medium">
                    Powered by B&P Code Labs | Contact: 0242099920
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 p-4 border-t bg-white sticky bottom-0">
                  <Button variant="outline" onClick={() => setShowStudentReport(null)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    const loadingToast = toast({
                      title: "Saving...",
                      description: "Updating report details",
                    });

                    // Construct the update payload
                    const payload = {
                      studentId: showStudentReport.id,
                      termId: selectedTerm,
                      attendance: parseInt(reportFormData.attendance) || 0,
                      attendanceTotal: parseInt(reportFormData.attendanceTotal) || 60,
                      attitude: reportFormData.attitude,
                      conduct: reportFormData.conduct,
                      interest: reportFormData.interest,
                      classTeacherRemark: reportFormData.teacherRemarks,
                      formMaster: reportFormData.formMaster,
                      nextTermBegins: reportFormData.nextTermBegins,
                    };

                    studentsApi.saveTermDetails(showStudentReport.id, payload)
                      .then(() => {
                        toast({
                          title: "Success",
                          description: "Report details saved successfully",
                        });
                      })
                      .catch((err: any) => {
                        console.error(err);
                        toast({
                          title: "Error",
                          description: "Failed to save report details",
                          variant: "destructive",
                        });
                      });
                  }} className="gap-2 bg-green-600 hover:bg-green-700">
                    <Save className="h-4 w-4" /> Save Information
                  </Button>
                  <Button
                    onClick={() => printStudentReport(showStudentReport)}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                    disabled={loadingReport}
                  >
                    {loadingReport ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
