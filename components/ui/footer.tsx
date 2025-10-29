"use client";

import { motion } from "framer-motion";
import {
  Code,
  Code2,
  Github,
  Globe,
  Heart,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  MessageCircle,
  Shield,
  Star,
  Upload as UploadIcon,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";

interface FooterProps {
  className?: string;
}

export function Footer({ className = "" }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    {
      name: "GitHub",
      url: "https://github.com/KaikiDeishuuu/PicoPics",
      icon: Github,
      color: "hover:text-foreground",
    },
    {
      name: "Telegram",
      url: "https://t.me/@OnonokiiBOT",
      icon: MessageCircle,
      color: "hover:text-blue-500",
    },
    {
      name: "Blog",
      url: "https://www.lambdax.me",
      icon: Globe,
      color: "hover:text-green-500",
    },
  ];

  const features = [
    { icon: Zap, text: "Fast Upload" },
    { icon: Shield, text: "Secure & Reliable" },
    { icon: Code, text: "Open Source" },
  ];

  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className={`footer-section card-modern ${className}`}
    >
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 项目信息 */}
          <div className="bg-card/50 rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                PicoPics V2
              </h3>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm leading-relaxed">
                Modern image hosting platform built with{" "}
                <span className="font-semibold text-foreground">
                  Next.js 15
                </span>{" "}
                +{" "}
                <span className="font-semibold text-foreground">
                  Cloudflare Workers
                </span>
                .
              </p>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 dark:bg-purple-500/20 rounded-full border border-purple-500/20 dark:border-purple-400/30"
              >
                <Code2 className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                  AI-Assisted Development
                </span>
              </motion.div>
            </div>
            <div className="flex flex-wrap gap-2">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-1 px-2 py-1 bg-blue-500/10 dark:bg-blue-500/20 rounded-full text-xs border border-blue-500/20 dark:border-blue-400/30"
                >
                  <feature.icon className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span className="text-blue-700 dark:text-blue-300 font-medium">
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 快速链接 */}
          <div className="bg-card/50 rounded-lg border border-border p-4 space-y-3">
            <h4 className="text-base font-semibold text-foreground">
              Quick Links
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  name: "Home",
                  href: "/",
                  icon: Home,
                  color: "from-blue-500 to-cyan-500",
                },
                {
                  name: "Upload",
                  href: "/upload",
                  icon: UploadIcon,
                  color: "from-purple-500 to-pink-500",
                },
                {
                  name: "Gallery",
                  href: "/gallery",
                  icon: ImageIcon,
                  color: "from-green-500 to-emerald-500",
                },
                {
                  name: "Admin",
                  href: "/admin",
                  icon: Shield,
                  color: "from-orange-500 to-red-500",
                },
              ].map((link, index) => (
                <motion.a
                  key={index}
                  href={link.href}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200 group"
                >
                  <div
                    className={`p-2 rounded-lg bg-gradient-to-r ${link.color} group-hover:shadow-lg transition-shadow`}
                  >
                    <link.icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {link.name}
                  </span>
                </motion.a>
              ))}
            </div>
          </div>

          {/* 联系信息 */}
          <div className="bg-card/50 rounded-lg border border-border p-4 space-y-3">
            <h4 className="text-base font-semibold text-foreground">Contact</h4>
            <div className="space-y-2">
              {socialLinks.map((link, index) => (
                <motion.a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02, x: 4 }}
                  className={`flex items-center space-x-2 text-sm text-muted-foreground transition-colors duration-200 ${link.color} p-2 rounded-md hover:bg-muted/50`}
                >
                  <div className="p-1.5 rounded-lg bg-muted/50">
                    <link.icon className="h-4 w-4" />
                  </div>
                  <span className="font-medium">{link.name}</span>
                </motion.a>
              ))}
            </div>
            <div className="p-3 bg-muted/30 rounded-lg border border-border space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-sm text-muted-foreground">Made with</span>
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "easeInOut",
                  }}
                  className="inline-block"
                >
                  <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                </motion.span>
                <span className="text-sm text-muted-foreground">by</span>
                <span className="text-sm font-semibold text-foreground">
                  Kaiki
                </span>
              </div>
              <div className="text-xs text-center text-muted-foreground">
                AI-Assisted Development
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>

        {/* 版权信息 */}
        <div className="mt-4 pt-4 border-t border-border text-center">
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <motion.span
              whileHover={{ scale: 1.1 }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              © {currentYear} PicoPics V2
            </motion.span>
            <span className="text-muted-foreground/30">•</span>
            <motion.span
              whileHover={{ scale: 1.1 }}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Shield className="h-3 w-3" />
              MIT License
            </motion.span>
            <span className="text-muted-foreground/30">•</span>
            <motion.span
              whileHover={{ scale: 1.1 }}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Zap className="h-3 w-3" />
              Next.js & Cloudflare
            </motion.span>
            <span className="text-muted-foreground/30">•</span>
            <motion.span
              whileHover={{ scale: 1.1 }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-400/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 dark:hover:bg-blue-500/30 transition-colors"
            >
              <Code2 className="h-3 w-3" />
              AI Code
            </motion.span>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}
