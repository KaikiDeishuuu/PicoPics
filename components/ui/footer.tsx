"use client";

import { motion } from "framer-motion";
import {
  Code,
  Github,
  Globe,
  Heart,
  MessageCircle,
  Shield,
  Star,
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
      color: "hover:text-gray-900 dark:hover:text-foreground",
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
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* 项目信息 */}
          <div className="bg-card/50 rounded-lg border border-border p-5 space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                PicoPics V2
              </h3>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Modern image hosting platform built with Next.js 15 + Cloudflare
              Workers.
            </p>
            <div className="flex flex-wrap gap-2">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-1 px-2 py-1 bg-yellow-500/20 rounded-full text-xs border border-yellow-500/30"
                >
                  <feature.icon className="h-3 w-3 text-yellow-400" />
                  <span className="text-yellow-300">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 快速链接 */}
          <div className="bg-card/50 rounded-lg border border-border p-5 space-y-4">
            <h4 className="text-lg font-semibold text-foreground mb-3">
              Quick Links
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {[
                { name: "Home", href: "/" },
                { name: "Upload", href: "/upload" },
                { name: "Gallery", href: "/gallery" },
                { name: "Admin", href: "/admin" },
              ].map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  className="block text-sm text-muted-foreground hover:text-primary transition-colors duration-200 p-2 rounded-lg hover:bg-muted/50"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>

          {/* 联系信息 */}
          <div className="bg-card/50 rounded-lg border border-border p-5 space-y-4">
            <h4 className="text-lg font-semibold text-foreground mb-3">
              Contact
            </h4>
            <div className="space-y-2">
              {socialLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center space-x-2 text-sm text-muted-foreground transition-colors duration-200 ${link.color} p-2 rounded-lg hover:bg-muted/50`}
                >
                  <link.icon className="h-4 w-4" />
                  <span>{link.name}</span>
                </a>
              ))}
            </div>
            <div className="p-3 bg-muted/30 rounded-lg border border-border mt-3 space-y-3">
              <div className="flex items-center space-x-2">
                <Heart className="h-4 w-4 text-red-400" />
                <span className="text-sm font-medium text-foreground">
                  Made with ❤️ by Kaiki
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>

        {/* 版权信息 */}
        <div className="mt-6 pt-6 border-t border-white/10 text-center">
          <div className="flex flex-wrap items-center justify-center space-x-4 text-sm text-muted-foreground">
            <span>© {currentYear} PicoPics V2</span>
            <span>•</span>
            <span>MIT License</span>
            <span>•</span>
            <span>Powered by Next.js & Cloudflare</span>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}
