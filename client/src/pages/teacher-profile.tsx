import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Save, CheckCircle, User, Phone, MapPin, Calendar, Mail } from "lucide-react";
import { MOCK_TEACHERS } from "@/lib/mock-data";

interface TeacherProfile {
  id: string;
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
}

export default function TeacherProfile() {
  const { username } = useAuth();
  const teacher = MOCK_TEACHERS.find(t => t.username === username);
  
  const [profile, setProfile] = useState<TeacherProfile>({
    id: teacher?.id || "",
    name: teacher?.name || "",
    email: teacher?.email || "",
    phone: "",
    dob: "",
    address: "",
    city: "Tarkwa",
    gender: "",
    nationalId: "",
    qualifications: "Bachelor's Degree",
    experience: "",
    bio: ""
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 border-b bg-white/80 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
            <User className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Teacher Portal</p>
            <p className="font-semibold text-foreground">Profile Settings</p>
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
                <h2 className="font-semibold text-lg">{profile.name}</h2>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                <p className="text-xs text-muted-foreground mt-2">ID: {profile.id}</p>
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
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={profile.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        placeholder="Enter your full name"
                      />
                    </div>
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
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
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

                {submitted && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 ml-2">
                      Profile updated successfully!
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter>
                <Button onClick={handleSave} className="w-full gap-2">
                  <Save className="h-4 w-4" />
                  Save Profile
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
