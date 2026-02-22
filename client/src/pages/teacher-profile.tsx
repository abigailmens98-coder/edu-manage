import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Save, CheckCircle, User, Phone, MapPin, Calendar, Mail, ArrowLeft, Loader2, KeyRound } from "lucide-react";
import { useLocation } from "wouter";
import { teachersApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface TeacherProfileData {
  id: string;
  teacherId: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  address: string;
  city: string;
  gender: string;
  nationalId: string;
  qualifications: string;
  experience: string;
  bio: string;
  username: string;
}

export default function TeacherProfile() {
  const { username, teacherInfo } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [profile, setProfile] = useState<TeacherProfileData>({
    id: "",
    teacherId: "",
    name: "",
    email: "",
    phone: "",
    dob: "",
    address: "",
    city: "Tarkwa",
    gender: "",
    nationalId: "",
    qualifications: "Bachelor's Degree",
    experience: "",
    bio: "",
    username: "",
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load teacher data from AuthContext teacherInfo
  useEffect(() => {
    if (teacherInfo) {
      setProfile(prev => ({
        ...prev,
        id: teacherInfo.id || "",
        teacherId: teacherInfo.teacherId || "",
        name: teacherInfo.name || "",
        email: teacherInfo.email || "",
        phone: teacherInfo.phone || "",
        dob: teacherInfo.dob || "",
        address: teacherInfo.address || "",
        city: teacherInfo.city || "Tarkwa",
        gender: teacherInfo.gender || "",
        nationalId: teacherInfo.nationalId || "",
        qualifications: teacherInfo.qualifications || "Bachelor's Degree",
        experience: teacherInfo.experience || "",
        bio: teacherInfo.bio || "",
        username: username || "",
      }));
    } else if (username) {
      setProfile(prev => ({
        ...prev,
        username: username,
      }));
    }
    setLoading(false);
  }, [teacherInfo, username]);

  const handleChange = (field: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!profile.id) {
      toast({
        title: "Error",
        description: "Teacher profile not found. Please try logging in again.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await teachersApi.update(profile.id, {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        dob: profile.dob,
        address: profile.address,
        city: profile.city,
        gender: profile.gender,
        nationalId: profile.nationalId,
        qualifications: profile.qualifications,
        experience: profile.experience,
        bio: profile.bio,
        username: profile.username,
      });

      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error: any) {
      console.error("Profile save error:", error);
      toast({
        title: "Save Failed",
        description: error?.message || "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 border-b bg-white/80 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
              <User className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Teacher Portal</p>
              <p className="font-semibold text-foreground">Profile Settings</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground mt-1">Update your personal and professional information</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Profile Overview Card */}
            <Card className="md:col-span-1">
              <CardContent className="pt-6 text-center">
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <User className="h-12 w-12 text-primary" />
                </div>
                <h2 className="font-semibold text-lg">{profile.name || "Teacher"}</h2>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                <p className="text-xs text-muted-foreground mt-2">ID: {profile.teacherId}</p>
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <KeyRound className="h-3.5 w-3.5" />
                    <span className="font-mono">{profile.username}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Profile Form */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your profile details and settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4 border-b pb-6">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Basic Information
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4" />
                        Username (Login)
                      </Label>
                      <Input
                        id="username"
                        value={profile.username}
                        onChange={(e) => handleChange("username", e.target.value)}
                        placeholder="Enter username"
                      />
                      <p className="text-xs text-muted-foreground">This is your login username. Changes will take effect on next login.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={profile.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        placeholder="your.email@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        placeholder="+233 5XX XXX XXX"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dob" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Date of Birth
                      </Label>
                      <Input
                        id="dob"
                        type="date"
                        value={profile.dob}
                        onChange={(e) => handleChange("dob", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select value={profile.gender} onValueChange={(val) => handleChange("gender", val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                          <SelectItem value="PREFER_NOT">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="space-y-4 border-b pb-6">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Address Information
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="address">Residential Address</Label>
                    <Textarea
                      id="address"
                      value={profile.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                      placeholder="Enter your full residential address"
                      className="min-h-20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City / Town</Label>
                    <Input
                      id="city"
                      value={profile.city}
                      onChange={(e) => handleChange("city", e.target.value)}
                      placeholder="Tarkwa"
                    />
                  </div>
                </div>

                {/* Professional Information */}
                <div className="space-y-4 border-b pb-6">
                  <h3 className="font-semibold">Professional Information</h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="qualifications">Qualifications</Label>
                      <Select value={profile.qualifications} onValueChange={(val) => handleChange("qualifications", val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select qualification" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Diploma">Diploma</SelectItem>
                          <SelectItem value="Bachelor's Degree">Bachelor's Degree</SelectItem>
                          <SelectItem value="Master's Degree">Master's Degree</SelectItem>
                          <SelectItem value="PhD">PhD</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="experience">Years of Experience</Label>
                      <Input
                        id="experience"
                        type="number"
                        min="0"
                        max="60"
                        value={profile.experience}
                        onChange={(e) => handleChange("experience", e.target.value)}
                        placeholder="e.g., 5"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nationalId">National ID / Passport</Label>
                    <Input
                      id="nationalId"
                      value={profile.nationalId}
                      onChange={(e) => handleChange("nationalId", e.target.value)}
                      placeholder="Enter your national ID number"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Professional Bio</h3>
                  <div className="space-y-2">
                    <Label htmlFor="bio">About You</Label>
                    <Textarea
                      id="bio"
                      value={profile.bio}
                      onChange={(e) => handleChange("bio", e.target.value)}
                      placeholder="Write a brief professional bio about yourself..."
                      className="min-h-24"
                    />
                    <p className="text-xs text-muted-foreground">{profile.bio.length} / 500 characters</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSave} className="w-full gap-2" disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
