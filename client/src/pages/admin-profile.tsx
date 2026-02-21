import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Key, Mail, Lock, CheckCircle, Smartphone, User, ShieldCheck } from "lucide-react";

export default function AdminProfile() {
    const { username, userId } = useAuth();
    const { toast } = useToast();

    const [profile, setProfile] = useState({
        username: username || "",
        email: "",
        secretWord: ""
    });

    const [passwords, setPasswords] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    const [loading, setLoading] = useState(false);
    const [passLoading, setPassLoading] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { user } = await authApi.me();
                setProfile({
                    username: user.username,
                    email: user.email || "",
                    secretWord: user.secretWord || ""
                });
            } catch (error) {
                console.error("Failed to fetch profile", error);
            }
        };
        fetchProfile();
    }, []);

    const handleProfileUpdate = async () => {
        setLoading(true);
        try {
            await authApi.updateProfile({
                email: profile.email,
                secretWord: profile.secretWord
            });
            toast({
                title: "Success",
                description: "Profile updated successfully!",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to update profile",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async () => {
        if (passwords.newPassword !== passwords.confirmPassword) {
            toast({
                title: "Error",
                description: "New passwords do not match",
                variant: "destructive",
            });
            return;
        }

        if (passwords.newPassword.length < 4) {
            toast({
                title: "Error",
                description: "Password must be at least 4 characters",
                variant: "destructive",
            });
            return;
        }

        setPassLoading(true);
        try {
            await authApi.changePassword({
                currentPassword: passwords.currentPassword,
                newPassword: passwords.newPassword
            });
            toast({
                title: "Success",
                description: "Password changed successfully!",
            });
            setPasswords({
                currentPassword: "",
                newPassword: "",
                confirmPassword: ""
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to change password",
                variant: "destructive",
            });
        } finally {
            setPassLoading(false);
        }
    };

    return (
        <div className="p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-foreground">Admin Profile</h1>
                    <p className="text-muted-foreground mt-1">Manage your account security and recovery settings</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Account Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                Account Settings
                            </CardTitle>
                            <CardDescription>Update your email and recovery secret word</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input id="username" value={profile.username} disabled className="bg-muted" />
                                <p className="text-[10px] text-muted-foreground italic">Username cannot be changed</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Recovery Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        className="pl-9"
                                        placeholder="admin@school.com"
                                        value={profile.email}
                                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="secret">Secret Word (for recovery)</Label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="secret"
                                        className="pl-9"
                                        placeholder="Enter a secret word"
                                        value={profile.secretWord}
                                        onChange={(e) => setProfile({ ...profile, secretWord: e.target.value })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleProfileUpdate} disabled={loading} className="w-full">
                                {loading ? "Updating..." : "Save Account Changes"}
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Password Change */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="h-5 w-5 text-primary" />
                                Change Password
                            </CardTitle>
                            <CardDescription>Keep your account secure with a strong password</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="curr-pass">Current Password</Label>
                                <Input
                                    id="curr-pass"
                                    type="password"
                                    value={passwords.currentPassword}
                                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-pass">New Password</Label>
                                <Input
                                    id="new-pass"
                                    type="password"
                                    value={passwords.newPassword}
                                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="conf-pass">Confirm New Password</Label>
                                <Input
                                    id="conf-pass"
                                    type="password"
                                    value={passwords.confirmPassword}
                                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handlePasswordChange} disabled={passLoading} variant="outline" className="w-full">
                                {passLoading ? "Changing..." : "Update Password"}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
