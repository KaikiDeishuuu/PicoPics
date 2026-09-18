"use client";

import { Github, Image, Menu, Shield, Upload, X, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/ui/footer";

export const dynamic = "force-dynamic";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{
    login: string;
    [key: string]: unknown;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || authChecked) return;

    const checkAuth = () => {
      const authData = localStorage.getItem("auth");
      if (authData) {
        try {
          const auth = JSON.parse(authData);
          if (auth.user && auth.accessToken) {
            setIsAuthenticated(true);
            setUser(auth.user);
            setAuthChecked(true);
            return true;
          }
        } catch (error) {
          console.error("Failed to parse auth data:", error);
          localStorage.removeItem("auth");
        }
      }
      setAuthChecked(true);
      return false;
    };

    const isAuth = checkAuth();
    if (!isAuth) {
      setIsAuthenticated(false);
      setUser(null);
    }
  }, [authChecked]);

  const handleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    if (!clientId) {
      console.error("NEXT_PUBLIC_GITHUB_CLIENT_ID is not configured");
      alert("GitHub OAuth not configured");
      return;
    }

    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = "user:email";
    // Cryptographic state for CSRF protection; verified by the callback page.
    const stateBytes = new Uint8Array(16);
    crypto.getRandomValues(stateBytes);
    const state = Array.from(stateBytes, (b) => b.toString(16).padStart(2, "0")).join("");
    sessionStorage.setItem("oauth_state", state);
    const authUrl =
      "https://github.com/login/oauth/authorize?client_id=" +
      clientId +
      "&redirect_uri=" +
      encodeURIComponent(redirectUri) +
      "&scope=" +
      scope +
      "&state=" +
      state;

    window.location.href = authUrl;
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth");
    }
    setIsAuthenticated(false);
    setUser(null);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-foreground mb-6">PicoPics V2</h1>
            <p className="text-xl text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] md:w-[90%] bg-card/90 backdrop-blur-sm border border-border rounded-2xl px-4 sm:px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-500 to-purple-500 grid place-items-center">
              <span className="text-white font-semibold text-lg">P</span>
            </div>
            <span className="font-semibold text-lg hidden sm:inline">PicoPics</span>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-sm">
                  <Github className="h-4 w-4" />
                  <span>{user?.login}</span>
                </div>
                <Link href="/admin">
                  <Button size="sm" variant="outline" className="rounded-lg">
                    <Shield className="h-4 w-4 mr-1" />
                    Admin
                  </Button>
                </Link>
                <Button
                  size="sm"
                  onClick={handleLogout}
                  variant="destructive"
                  className="rounded-lg"
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button onClick={handleLogin} size="sm" variant="outline" className="rounded-lg">
                <Github className="h-4 w-4 mr-2" />
                Login
              </Button>
            )}
          </div>
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-muted transition"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {isMobileMenuOpen && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-[95%] md:hidden bg-card/95 backdrop-blur-sm border border-border rounded-2xl shadow-lg p-4">
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
                  <Github className="h-4 w-4" />
                  <span className="text-sm">{user?.login}</span>
                </div>
                <Link
                  href="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <Shield className="h-4 w-4" />
                  <span className="text-sm">Admin</span>
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground transition-colors w-full"
                >
                  <span className="text-sm">Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  handleLogin();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors w-full"
              >
                <Github className="h-4 w-4" />
                <span className="text-sm">Login</span>
              </button>
            )}
          </div>
        )}

        <div className="text-center mb-10 px-4 mt-20">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-3">PicoPics V2</h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-6">
            Modern Image Hosting Platform
          </p>
          {isAuthenticated ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/upload">
                <Button size="lg" className="w-full sm:w-auto">
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Images
                </Button>
              </Link>
              <Link href="/gallery">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <Image className="h-5 w-5 mr-2" />
                  My Gallery
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-lg text-muted-foreground">
                Please login to use image upload feature
              </p>
              <Button onClick={handleLogin} size="lg">
                <Github className="h-5 w-5 mr-2" />
                Login with GitHub
              </Button>
            </div>
          )}
        </div>

        <div className="mb-10 px-4">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-foreground">Why PicoPics?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: Zap,
                title: "极速上传",
                description: "边缘部署、并发队列、粘贴即传",
              },
              {
                icon: Shield,
                title: "隐私安全",
                description: "GitHub 登录，自动剥离 EXIF 位置信息",
              },
              {
                icon: Image,
                title: "即取即用",
                description: "一键复制 URL / Markdown / HTML / BBCode",
              },
            ].map((feature) => (
              <Card key={feature.title} className="border border-border">
                <CardContent className="pt-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                  </div>
                  <CardDescription className="text-sm">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
