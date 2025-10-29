"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Download,
  Github,
  Globe,
  Image,
  Menu,
  Shield,
  Sparkles,
  Star,
  Upload,
  Users,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import {
  AnimatedDiv,
  cardHoverVariants,
  listItemVariants,
  pageTransition,
  pageVariants,
  pulseVariants,
  StaggerContainer,
} from "@/components/ui/animations";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DynamicBackground } from "@/components/ui/dynamic-background";
import { Footer } from "@/components/ui/footer";
import { LoadingSpinner } from "@/components/ui/loading";
import { ThemeToggle } from "@/components/ThemeToggle";

// 强制动态渲染，避免静态化
export const dynamic = "force-dynamic";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{
    login: string;
    [key: string]: unknown;
  } | null>(null);

  // Add runtime check to ensure dynamic rendering
  const [mounted, setMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: Zap,
      title: "Ultimate Performance",
      description:
        "Cloudflare Workers edge computing, global millisecond response",
      color: "from-yellow-400 to-orange-500",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description:
        "GitHub OAuth authentication, JWT Token verification, IP blacklist protection",
      color: "from-green-400 to-emerald-500",
    },
    {
      icon: Globe,
      title: "Global Deployment",
      description:
        "Vercel global CDN, Cloudflare edge network, zero operational costs",
      color: "from-blue-400 to-cyan-500",
    },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Check authentication status in local storage
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
          // Clear invalid authentication data
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

  // Auto-switch feature display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [features.length]);

  const handleGitHubLogin = () => {
    // GitHub OAuth login logic
    const clientId =
      process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || "Ov23lijBobxzGOfTVu9U";
    if (!clientId) {
      alert("GitHub OAuth not configured");
      return;
    }

    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = "user:email";
    const state = Math.random().toString(36).substring(7);

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${scope}&state=${state}`;

    window.location.href = authUrl;
  };

  const handleLogin = () => {
    const clientId =
      process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || "Ov23lijBobxzGOfTVu9U";
    if (!clientId) {
      alert("GitHub OAuth not configured");
      return;
    }

    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = "user:email";
    const state = Math.random().toString(36).substring(7);

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${scope}&state=${state}`;

    window.location.href = authUrl;
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth");
    }
    setIsAuthenticated(false);
    setUser(null);
  };

  // 确保客户端渲染
  if (!mounted) {
    return (
      <DynamicBackground
        variant="rainbow"
        intensity="medium"
        speed="slow"
        className="min-h-screen"
      >
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <LoadingSpinner size="lg" />
            </div>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-6">
              PicoPics V2
            </h1>
            <p className="text-xl text-foreground drop-shadow-lg">
              正在加载...
            </p>
          </div>
        </div>
      </DynamicBackground>
    );
  }

  return (
    <DynamicBackground
      variant="rainbow"
      intensity="medium"
      speed="slow"
      className="min-h-screen"
    >
      <motion.div
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="container mx-auto px-4 py-16"
      >
        {/* ✅ 统一、响应式 Header */}
        <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] md:w-[90%] bg-background/70 backdrop-blur-xl border border-border/50 rounded-2xl shadow-sm px-4 sm:px-6 py-2 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-500 via-cyan-400 to-purple-500 grid place-items-center">
              <span className="text-white font-semibold text-lg">K</span>
            </div>
            <span className="font-semibold text-lg hidden sm:inline">
              PicoPics
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                {/* 用户信息 */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors text-sm">
                  <Github className="h-4 w-4" />
                  <span>{user?.login}</span>
                </div>

                {/* Admin */}
                <Link href="/admin">
                  <Button size="sm" variant="outline" className="rounded-lg">
                    <Shield className="h-4 w-4 mr-1" />
                    Admin
                  </Button>
                </Link>

                {/* Logout */}
                <Button
                  size="sm"
                  onClick={handleLogout}
                  className="rounded-lg bg-red-500/80 hover:bg-red-500 text-white"
                >
                  Quit
                </Button>
              </>
            ) : (
              <Button
                onClick={handleLogin}
                size="sm"
                variant="outline"
                className="rounded-lg"
              >
                <Github className="h-4 w-4 mr-2" />
                Login
              </Button>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-muted/50 transition"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </header>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-[95%] md:hidden bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-lg p-4"
          >
            {isAuthenticated ? (
              <div className="space-y-2">
                {/* 用户信息 */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40">
                  <Github className="h-4 w-4" />
                  <span className="text-sm">{user?.login}</span>
                </div>

                {/* Admin */}
                <Link
                  href="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Shield className="h-4 w-4" />
                  <span className="text-sm">Admin</span>
                </Link>

                {/* Logout */}
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/80 hover:bg-red-500 text-white transition-colors w-full"
                >
                  <span className="text-sm">Quit</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  handleLogin();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors w-full"
              >
                <Github className="h-4 w-4" />
                <span className="text-sm">Login</span>
              </button>
            )}
          </motion.div>
        )}

        {/* 主要内容 */}
        <div className="text-center mb-8 md:mb-16 px-4 mt-24">
          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-4xl sm:text-6xl md:text-7xl lg:text-9xl font-bold bg-gradient-to-r from-blue-400 via-cyan-500 to-purple-500 bg-clip-text text-transparent mb-4 md:mb-6"
          >
            PicoPics V2
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-foreground drop-shadow-lg mb-3 md:mb-4"
          >
            Modern Image Hosting Platform
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="text-sm sm:text-base md:text-lg lg:text-xl text-foreground/90 drop-shadow-lg mb-8 md:mb-12 max-w-3xl mx-auto"
          >
            Next-generation image sharing solution built with Next.js 15 +
            Cloudflare Workers, delivering exceptional performance and user
            experience
          </motion.p>

          {isAuthenticated ? (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/upload">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Images
                </Button>
              </Link>
              <Link href="/gallery">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto bg-card/80 backdrop-blur-sm border-2 border-blue-500 text-blue-400 hover:bg-blue-500/20"
                >
                  <Image className="h-5 w-5 mr-2" />
                  My Gallery
                </Button>
              </Link>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
              className="space-y-6"
            >
              <p className="text-xl text-foreground drop-shadow-lg">
                Please login to use image upload feature
              </p>
              <Button
                onClick={handleGitHubLogin}
                size="lg"
                className="bg-gray-900 hover:bg-gray-800 text-white shadow-lg"
              >
                <Github className="h-5 w-5 mr-2" />
                Login with GitHub
              </Button>
            </motion.div>
          )}
        </div>

        {/* 动态特性展示 */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground drop-shadow-lg mb-4">
              Core Features
            </h2>
            <p className="text-foreground/90 drop-shadow-lg">
              Experience the next-generation image hosting platform
            </p>
          </div>

          <div className="relative h-64 rounded-2xl overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentFeature}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                <Card className="h-full card-modern shadow-xl">
                  <CardContent className="h-full flex items-center justify-center p-8">
                    <div className="text-center">
                      <motion.div
                        variants={pulseVariants}
                        animate="pulse"
                        className={`inline-flex p-4 rounded-full bg-gradient-to-r ${features[currentFeature].color} mb-4`}
                      >
                        {React.createElement(features[currentFeature].icon, {
                          className: "h-8 w-8 text-white",
                        })}
                      </motion.div>
                      <h3 className="text-2xl font-bold text-foreground mb-2">
                        {features[currentFeature].title}
                      </h3>
                      <p className="text-foreground/80 max-w-md">
                        {features[currentFeature].description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* 特性网格 */}
        <StaggerContainer className="mb-8 md:mb-16 px-4">
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 md:mb-4">
              Why Choose PicoPics V2?
            </h2>
            <p className="text-sm md:text-base text-foreground/80">
              Modern tech stack, exceptional user experience
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {[
              {
                icon: Zap,
                title: "Ultimate Performance",
                description:
                  "Cloudflare Workers edge computing, global millisecond response, intelligent image compression and caching",
                color: "from-yellow-400 to-orange-500",
              },
              {
                icon: Shield,
                title: "Enterprise Security",
                description:
                  "GitHub OAuth authentication, JWT Token verification, IP blacklist protection, upload quota management",
                color: "from-green-400 to-emerald-500",
              },
              {
                icon: Globe,
                title: "Global Deployment",
                description:
                  "Vercel global CDN, Cloudflare edge network, zero operational costs, auto-scaling",
                color: "from-blue-400 to-cyan-500",
              },
              {
                icon: Users,
                title: "User Friendly",
                description:
                  "Intuitive interface design, drag-and-drop upload, real-time preview, batch operations, history records",
                color: "from-purple-400 to-pink-500",
              },
              {
                icon: Clock,
                title: "Real-time Sync",
                description:
                  "Real-time data synchronization, multi-device access, cloud storage, automatic backup, version control",
                color: "from-indigo-400 to-blue-500",
              },
              {
                icon: Download,
                title: "Easy Sharing",
                description:
                  "One-click sharing links, multiple format support, batch download, social sharing, embed code",
                color: "from-teal-400 to-green-500",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                variants={listItemVariants}
                custom={index}
              >
                <Card className="h-full card-modern hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-3 rounded-lg bg-gradient-to-r ${feature.color}`}
                      >
                        <feature.icon className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className="text-xl text-foreground">
                        {feature.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base text-muted-foreground">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </StaggerContainer>

        {/* AI 创作声明 */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0, ease: "easeOut" }}
          className="mb-8 md:mb-16 px-4"
        >
          <Card className="card-modern bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-purple-500/10 border-2 border-blue-500/20">
            <CardContent className="p-6 md:p-8">
              <div className="text-center max-w-3xl mx-auto">
                <div className="mb-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 dark:bg-blue-500/30 rounded-full border border-blue-500/30">
                    <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                      AI-Assisted Development
                    </span>
                  </div>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                  Built with AI Collaboration
                </h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-4">
                  This entire project was created with AI assistance. Every line
                  of code, design decision, and architectural choice was
                  developed collaboratively with AI to ensure a modern,
                  efficient, and maintainable codebase.
                </p>
                <p className="text-sm md:text-base text-muted-foreground/80">
                  From initial concept to production deployment, AI has been an
                  integral part of bringing PicoPics V2 to life.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 技术栈展示 */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2, ease: "easeOut" }}
          className="text-center"
        >
          <h2 className="text-4xl font-bold text-foreground mb-8">
            Tech Stack
          </h2>
          <div className="tech-stack-container">
            {[
              { name: "Next.js 15" },
              { name: "React 18" },
              { name: "TypeScript" },
              { name: "Tailwind CSS" },
              { name: "Cloudflare Workers" },
              { name: "Vercel" },
              { name: "Framer Motion" },
              { name: "PWA" },
            ].map((tech, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 1.4 + index * 0.1 }}
                className="tech-tag"
              >
                {tech.name}
              </motion.span>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <Footer />
      </motion.div>
    </DynamicBackground>
  );
}
