"use client";

import {
  Github,
  Image,
  Menu,
  Shield,
  Upload,
  X,
  Zap,
  Globe,
  Users,
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Footer } from "@/components/ui/footer";
import { ThemeToggle } from "@/components/ThemeToggle";

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
    if (!isAuth){
      setIsAuthenticated(false);
      setUser(null);
    }
  }, [authChecked]);

  const handleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || "Ov23lijBobxzGOfTVu9U";
    if (!clientId){
      alert("GitHub OAuth not configured");
      return;
    }

    const redirectUri = window.location.origin + "/auth/callback";
    const scope = "user:email";
    const state = Math.random().toString(36).substring(7);
    const authUrl = "https://github.com/login/oauth/authorize?client_id=" + clientId + "&redirect_uri=" + encodeURIComponent(redirectUri) + "&scope=" + scope + "&state=" + state;

    window.location.href = authUrl;
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth");
    }
    setIsAuthenticated(false);
    setUser(null);
  };

  if (!mounted){
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
      <div className="container mx-auto px-4 py-16">
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
                <Button size="sm" onClick={handleLogout} variant="destructive" className="rounded-lg">
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
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}className="p-2rounded-lghover:bg-mutedtransition">
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
                <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm">Admin</span>
                </Link>
                <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground transition-colors w-full">
                  <span className="text-sm">Logout</span>
                </button>
              </div>
            ) : (
              <button onClick={() => { handleLogin(); setIsMobileMenuOpen(false); }} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors w-full">
                <Github className="h-4 w-4" />
                <span className="text-sm">Login</span>
              </button>
            )}
          </div>
        )}

        <div className="text-center mb-16 px-4 mt-24">
          <h1 className="text-6xl md:text-8xl font-bold text-foreground mb-4">PicoPics V2</h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">Modern Image Hosting Platform</p>
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
              <p className="text-lg text-muted-foreground">Please login to use image upload feature</p>
              <Button onClick={handleLogin} size="lg">
                <Github className="h-5 w-5 mr-2" />
                Login with GitHub
              </Button>
            </div>
          )}
        </div>

        <div className="mb-16 px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-4">Why Choose PicoPics?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: "Ultimate Performance", description: "Cloudflare Workers edge computing, global millisecond response" },
              { icon: Shield, title: "Enterprise Security", description: "GitHub OAuth authentication, JWT Token verification" },
              { icon: Globe, title: "Global Deployment", description: "Vercel global CDN, Cloudflare edge network, zero costs" },
              { icon: Users, title: "User Friendly", description: "Intuitive interface, drag-and-drop upload, real-time preview" },
              { icon: Image, title: "Easy Sharing", description: "One-click sharing links, multiple format support" },
              { icon: Upload, title: "Batch Upload", description: "Upload multiple images at once, automatic compression" },
            ].map((feature, index) => (
              <Card key={index} className="border border-border">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8">Tech Stack</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {["Next.js 15", "React 18", "TypeScript", "Tailwind CSS", "Cloudflare Workers", "Vercel"].map((tech, index) => (
              <span key={index} className="px-4 py-2 bg-muted rounded-full text-sm font-medium">{tech}</span>
            ))}
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
