'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';
import { 
  Brain, 
  Sparkles, 
  TrendingUp, 
  Users, 
  BookOpen, 
  Award, 
  ArrowRight,
  Play,
  CheckCircle,
  Star,
  Globe,
  Zap,
  Target,
  BarChart3,
  MessageSquare,
  ChevronRight,
  Menu,
  X,
  Microscope,
  FlaskConical,
  Atom,
  Calculator,
  Camera,
  Eye,
  MapPin,
  Activity,
  Heart,
  Map,
  FileText,
  Video,
  Kanban
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export default function HomePage() {
  const { t } = useLanguage();

  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        .animate-gradient-x {
          animation: gradient-x 4s ease infinite;
        }
      `}</style>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-border bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75 dark:bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-foreground" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-red-400 via-teal-400 to-green-400 bg-[length:300%_300%] animate-gradient-x bg-clip-text text-transparent">
                  AeroEdu
                </span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#products" className="text-muted-foreground hover:text-foreground font-medium transition-colors">{t('landing.nav.products')}</a>
              <a href="#solutions" className="text-muted-foreground hover:text-foreground font-medium transition-colors">{t('landing.nav.solutions')}</a>
              <a href="#developers" className="text-muted-foreground hover:text-foreground font-medium transition-colors">{t('landing.nav.developers')}</a>
              <a href="#resources" className="text-muted-foreground hover:text-foreground font-medium transition-colors">{t('landing.nav.resources')}</a>
              <a href="/pricing" className="text-muted-foreground hover:text-foreground font-medium transition-colors">{t('landing.nav.pricing')}</a>
            </nav>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-2 sm:space-x-4">
              <ThemeToggle />
              <LanguageSwitcherCompact />
              <button 
                onClick={() => router.push('/auth/login')}
                className="text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                {t('landing.nav.login')}
              </button>
              <button 
                onClick={() => router.push('/auth/signup')}
                className="rounded-lg bg-foreground px-4 py-2 font-medium text-background transition-colors hover:opacity-90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
              >
                {t('landing.nav.getStarted')}
              </button>
              <button 
                onClick={() => router.push('/contact-sales')}
                className="text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                {t('landing.nav.contactSales')}
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-foreground"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? t('landing.a11y.closeMenu') : t('landing.a11y.openMenu')}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <div className="px-4 py-4 space-y-4">
              <a href="#products" className="block font-medium text-muted-foreground transition-colors hover:text-foreground">{t('landing.nav.products')}</a>
              <a href="#solutions" className="block font-medium text-muted-foreground transition-colors hover:text-foreground">{t('landing.nav.solutions')}</a>
              <a href="#developers" className="block font-medium text-muted-foreground transition-colors hover:text-foreground">{t('landing.nav.developers')}</a>
              <a href="#resources" className="block font-medium text-muted-foreground transition-colors hover:text-foreground">{t('landing.nav.resources')}</a>
              <a href="/pricing" className="block font-medium text-muted-foreground transition-colors hover:text-foreground">{t('landing.nav.pricing')}</a>
              <div className="space-y-2 border-t border-border pt-4">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <ThemeToggle />
                  <LanguageSwitcherCompact />
                </div>
                <button 
                  onClick={() => router.push('/auth/login')}
                  className="block w-full text-left font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t('landing.nav.login')}
                </button>
                <button 
                  onClick={() => router.push('/auth/signup')}
                  className="block w-full rounded-lg bg-foreground px-4 py-2 font-medium text-background transition-colors hover:opacity-90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
                >
                  {t('landing.nav.getStarted')}
                </button>
                <button 
                  onClick={() => router.push('/contact-sales')}
                  className="block w-full text-left font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t('landing.nav.contactSales')}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-16 pt-24 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Hero Content */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center rounded-full border border-border bg-card px-4 py-2 shadow-sm">
                <Sparkles className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-foreground">{t('landing.hero.badge')}</span>
              </div>

              {/* Main Headline */}
              <div className="space-y-4">
                <h1 className="text-5xl font-bold leading-tight text-foreground lg:text-6xl">
                  {t('landing.hero.headline1')}
                  <br />
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-pink-400">
                    {t('landing.hero.headline2')}
                  </span>
                  <br />
                  {t('landing.hero.headline3')}
                </h1>
                <p className="max-w-2xl text-xl text-muted-foreground">
                  {t('landing.hero.sub')}
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => router.push('/auth/signup')}
                  className="flex items-center justify-center rounded-xl bg-foreground px-8 py-4 font-semibold text-background shadow-lg transition-all hover:opacity-90 hover:shadow-xl dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
                >
                  {t('landing.hero.ctaPrimary')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
                <button 
                  onClick={() => router.push('/contact-sales')}
                  className="flex items-center justify-center rounded-xl border border-border px-8 py-4 font-semibold text-foreground transition-all hover:bg-muted/60"
                >
                  {t('landing.nav.contactSales')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {t('landing.hero.agreePrefix')}{' '}
                <a href="/terms" className="text-purple-600 hover:underline dark:text-purple-400">{t('landing.hero.terms')}</a>
                {' '}{t('landing.hero.and')}{' '}
                <a href="/privacy" className="text-purple-600 hover:underline dark:text-purple-400">{t('landing.hero.privacy')}</a>
                {t('landing.hero.agreeSuffix')}
              </p>
            </div>

            {/* Right Column - Interactive Demo */}
            <div className="relative">
              <div className="rounded-3xl border border-border bg-card p-8 shadow-2xl">
                {/* Demo Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{t('landing.demo.aiTutor')}</h3>
                      <p className="text-sm text-muted-foreground">{t('landing.demo.active')}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-muted-foreground">{t('landing.demo.live')}</span>
                  </div>
                </div>

                {/* Demo Content */}
                <div className="space-y-4">
                  <div className="rounded-xl bg-muted/50 p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950/60">
                        <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-2">{t('landing.demo.studentAsk')}</p>
                        <div className="rounded-lg bg-card p-3 shadow-sm">
                          <p className="text-sm text-foreground">
                            {t('landing.demo.aiReply')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 p-4 dark:from-purple-950/40 dark:to-pink-950/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <BarChart3 className="h-5 w-5 text-purple-600" />
                        <span className="font-medium text-foreground">{t('landing.demo.progress')}</span>
                      </div>
                      <span className="text-sm font-semibold text-purple-600">+24%</span>
                    </div>
                    <div className="mt-3 rounded-lg bg-card p-3">
                      <div className="flex justify-between text-sm text-muted-foreground mb-2">
                        <span>{t('landing.demo.math')}</span>
                        <span>85%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full" style={{width: '85%'}}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Demo Stats */}
                <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">10K+</div>
                    <div className="text-sm text-muted-foreground">{t('landing.demo.statStudents')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">500+</div>
                    <div className="text-sm text-muted-foreground">{t('landing.demo.statTeachers')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">95%</div>
                    <div className="text-sm text-muted-foreground">{t('landing.demo.statHappy')}</div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <Star className="h-4 w-4 text-white" />
              </div>
              <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                <CheckCircle className="h-3 w-3 text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="bg-background py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">{t('landing.products.title')}</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('landing.products.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* AI Tutor */}
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-8 transition-all duration-300 hover:shadow-lg dark:border-blue-900/40 dark:from-blue-950/50 dark:to-cyan-950/50">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">AI Tutor</h3>
              <p className="text-muted-foreground mb-6">{t('landing.product.aiTutor.desc')}</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.aiTutor.f1')}
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.aiTutor.f2')}
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.aiTutor.f3')}
                </li>
              </ul>
            </div>

            {/* Learning Path */}
            <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 p-8 transition-all duration-300 hover:shadow-lg dark:border-purple-900/40 dark:from-purple-950/50 dark:to-pink-950/50">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-6">
                <Target className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Learning Path</h3>
              <p className="text-muted-foreground mb-6">{t('landing.product.learningPath.desc')}</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.learningPath.f1')}
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.learningPath.f2')}
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.learningPath.f3')}
                </li>
              </ul>
            </div>

            {/* Analytics */}
            <div className="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-8 transition-all duration-300 hover:shadow-lg dark:border-green-900/40 dark:from-green-950/50 dark:to-emerald-950/50">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">{t('analytics.title')}</h3>
              <p className="text-muted-foreground mb-6">{t('landing.product.analytics.desc')}</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.analytics.f1')}
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.analytics.f2')}
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.analytics.f3')}
                </li>
              </ul>
            </div>

            {/* STEM */}
            <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-red-50 p-8 transition-all duration-300 hover:shadow-lg dark:border-orange-900/40 dark:from-orange-950/50 dark:to-red-950/50">
              <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mb-6">
                <Atom className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">STEM</h3>
              <p className="text-muted-foreground mb-6">{t('landing.product.stem.desc')}</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.stem.f1')}
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.stem.f2')}
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.stem.f3')}
                </li>
              </ul>
            </div>

            {/* LabTwin */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-blue-50 p-8 transition-all duration-300 hover:shadow-lg dark:border-indigo-900/40 dark:from-indigo-950/50 dark:to-blue-950/50">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-6">
                <Microscope className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">LabTwin</h3>
              <p className="text-muted-foreground mb-6">{t('landing.product.labTwin.desc')}</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.labTwin.f1')}
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.labTwin.f2')}
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.labTwin.f3')}
                </li>
              </ul>
            </div>

            {/* Vision Tracker */}
            <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-cyan-50 p-8 transition-all duration-300 hover:shadow-lg dark:border-teal-900/40 dark:from-teal-950/50 dark:to-cyan-950/50">
              <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center mb-6">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">{t('vision.title')}</h3>
              <p className="text-muted-foreground mb-6">{t('landing.product.visionTracker.desc')}</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.visionTracker.f1')}
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.visionTracker.f2')}
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.visionTracker.f3')}
                </li>
              </ul>
            </div>

            {/* Heart Map */}
            <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-rose-50 p-8 transition-all duration-300 hover:shadow-lg dark:border-pink-900/40 dark:from-pink-950/50 dark:to-rose-950/50">
              <div className="w-12 h-12 bg-pink-600 rounded-xl flex items-center justify-center mb-6">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">{t('emotion.heart-map')}</h3>
              <p className="text-muted-foreground mb-6">{t('landing.product.heartMap.desc')}</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.heartMap.f1')}
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.heartMap.f2')}
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.heartMap.f3')}
                </li>
              </ul>
            </div>

            {/* AeroEdu Vision */}
            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50 p-8 transition-all duration-300 hover:shadow-lg dark:border-violet-900/40 dark:from-violet-950/50 dark:to-purple-950/50">
              <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center mb-6">
                <Eye className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">AeroEdu Vision</h3>
              <p className="text-muted-foreground mb-6">{t('landing.product.aeroVision.desc')}</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.aeroVision.f1')}
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.aeroVision.f2')}
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.aeroVision.f3')}
                </li>
              </ul>
            </div>

            {/* Smart Classroom */}
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-green-50 p-8 transition-all duration-300 hover:shadow-lg dark:border-emerald-900/40 dark:from-emerald-950/50 dark:to-green-950/50">
              <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mb-6">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Smart Classroom</h3>
              <p className="text-muted-foreground mb-6">{t('landing.product.smartClass.desc')}</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.smartClass.f1')}
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.smartClass.f2')}
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.smartClass.f3')}
                </li>
              </ul>
            </div>

            {/* Quản lý dự án */}
            <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-yellow-50 p-8 transition-all duration-300 hover:shadow-lg dark:border-amber-900/40 dark:from-amber-950/50 dark:to-yellow-950/40">
              <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center mb-6">
                <Kanban className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">{t('landing.product.project.title')}</h3>
              <p className="text-muted-foreground mb-6">{t('landing.product.project.desc')}</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.project.f1')}
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.project.f2')}
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.project.f3')}
                </li>
              </ul>
            </div>

            {/* Motion Tracking */}
            <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-gray-50 p-8 transition-all duration-300 hover:shadow-lg dark:border-slate-700 dark:from-slate-900/60 dark:to-slate-950/80">
              <div className="w-12 h-12 bg-slate-600 rounded-xl flex items-center justify-center mb-6">
                <Video className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Motion Tracking</h3>
              <p className="text-muted-foreground mb-6">{t('landing.product.motion.desc')}</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.motion.f1')}
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.motion.f2')}
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {t('landing.product.motion.f3')}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-muted/40 py-20 dark:bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-foreground mb-2">10,000+</div>
              <div className="text-muted-foreground">{t('landing.stats.students')}</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-foreground mb-2">500+</div>
              <div className="text-muted-foreground">{t('landing.stats.teachers')}</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-foreground mb-2">50+</div>
              <div className="text-muted-foreground">{t('landing.stats.schools')}</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-foreground mb-2">95%</div>
              <div className="text-muted-foreground">{t('landing.stats.satisfaction')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* AeroEdu Vision App Section */}
      <section className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 py-20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="mb-6 inline-flex items-center rounded-full bg-gradient-to-r from-purple-100 to-blue-100 px-6 py-3 dark:from-purple-900/40 dark:to-blue-900/40">
              <Sparkles className="mr-2 h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-semibold text-purple-900 dark:text-purple-200">{t('landing.vision.badge')}</span>
            </div>
            
            {/* AeroEdu Vision Logo */}
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center shadow-2xl">
                <svg width="60" height="60" viewBox="0 0 60 60" className="text-white">
                  {/* Organic shape outline */}
                  <path d="M15 10 C10 15, 10 25, 15 30 C20 35, 40 35, 45 30 C50 25, 50 15, 45 10 C40 5, 20 5, 15 10 Z" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"/>
                  
                  {/* Central vertical line */}
                  <line x1="30" y1="12" x2="30" y2="48" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round"/>
                  
                  {/* Left half diagonal lines */}
                  <line x1="30" y1="20" x2="22" y2="16" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"/>
                  <line x1="30" y1="25" x2="22" y2="21" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"/>
                  
                  {/* Right half diagonal lines */}
                  <line x1="30" y1="20" x2="38" y2="24" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"/>
                  <line x1="30" y1="25" x2="38" y2="29" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            
            <h2 className="text-5xl font-bold text-foreground mb-6">
              AeroEdu Vision
              <span className="block bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-3xl text-transparent dark:from-purple-400 dark:to-blue-400">
                {t('landing.vision.titleSub')}
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              {t('landing.vision.intro')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left - Enhanced Info */}
            <div>
              {/* Key Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="rounded-xl border border-purple-100 bg-card p-6 shadow-lg dark:border-purple-900/40">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center mb-4">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{t('landing.vision.card1t')}</h3>
                  <p className="text-muted-foreground text-sm">{t('landing.vision.card1d')}</p>
                </div>
                
                <div className="rounded-xl border border-blue-100 bg-card p-6 shadow-lg dark:border-blue-900/40">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mb-4">
                    <MessageSquare className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{t('landing.vision.card2t')}</h3>
                  <p className="text-muted-foreground text-sm">{t('landing.vision.card2d')}</p>
                </div>
                
                <div className="rounded-xl border border-green-100 bg-card p-6 shadow-lg dark:border-green-900/40">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center mb-4">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{t('landing.vision.card3t')}</h3>
                  <p className="text-muted-foreground text-sm">{t('landing.vision.card3d')}</p>
                </div>
                
                <div className="rounded-xl border border-orange-100 bg-card p-6 shadow-lg dark:border-orange-900/40">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center mb-4">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{t('landing.vision.card4t')}</h3>
                  <p className="text-muted-foreground text-sm">{t('landing.vision.card4d')}</p>
                </div>
              </div>
              
              {/* Detailed Features List */}
              <div className="mb-8 rounded-2xl border border-border bg-card p-8 shadow-xl">
                <h3 className="text-xl font-bold text-foreground mb-6 flex items-center">
                  <Star className="h-6 w-6 text-yellow-500 mr-2" />
                  {t('landing.vision.featuresTitle')}
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">{t('landing.vision.feat1t')}</p>
                      <p className="text-muted-foreground text-sm">{t('landing.vision.feat1d')}</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">{t('landing.vision.feat2t')}</p>
                      <p className="text-muted-foreground text-sm">{t('landing.vision.feat2d')}</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">{t('landing.vision.feat3t')}</p>
                      <p className="text-muted-foreground text-sm">{t('landing.vision.feat3d')}</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">{t('landing.vision.feat4t')}</p>
                      <p className="text-muted-foreground text-sm">{t('landing.vision.feat4d')}</p>
                    </div>
                  </li>
                </ul>
              </div>
              
              {/* App Statistics */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 text-white mb-8">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  {t('landing.vision.appStats')}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">24</div>
                    <div className="text-sm opacity-90">{t('landing.vision.graded')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">3</div>
                    <div className="text-sm opacity-90">{t('landing.vision.processing')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-pink-600">94%</div>
                    <div className="text-sm opacity-90">{t('landing.vision.accuracy')}</div>
                  </div>
                </div>
              </div>
              
              {/* Download Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="https://apps.apple.com/app/aeroedu-vision" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center bg-black text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl"
                >
                  <svg className="h-8 w-8 mr-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs">{t('landing.vision.downloadOn')}</div>
                    <div className="text-lg font-bold">App Store</div>
                  </div>
                </a>
                
                <div className="flex items-center bg-gray-300 text-muted-foreground px-8 py-4 rounded-xl font-semibold cursor-not-allowed shadow-lg">
                  <svg className="h-8 w-8 mr-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs">{t('landing.vision.comingOn')}</div>
                    <div className="text-lg font-bold">Google Play</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/50 dark:bg-blue-950/40">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {t('landing.vision.iosLine')}<br/>
                  {t('landing.vision.androidLine')}<br/>
                  <span className="font-semibold">{t('landing.vision.webLineBefore')}</span>{' '}
                  <a href="/dashboard/llm-grading" className="underline">AeroEdu Dashboard</a>
                </p>
              </div>
            </div>
            
            {/* Right - Enhanced App Preview */}
            <div className="relative">
              {/* Main App Mockup */}
              <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 rounded-3xl p-8 shadow-2xl">
                <div className="rounded-2xl bg-card p-6 shadow-xl">
                  {/* iPhone Mockup */}
                  <div className="aspect-[9/19.5] bg-black rounded-3xl p-2 mx-auto max-w-xs">
                    <div className="bg-white rounded-2xl h-full flex flex-col">
                      {/* Status bar */}
                      <div className="h-8 bg-white rounded-t-2xl flex items-center justify-between px-4">
                        <span className="text-xs font-semibold text-foreground">9:41</span>
                        <div className="flex items-center space-x-1">
                          <div className="w-4 h-2 bg-gray-900 rounded-sm"></div>
                          <div className="w-1 h-1 bg-gray-900 rounded-full"></div>
                        </div>
                      </div>
                      
                      {/* App content */}
                      <div className="flex-1 bg-gradient-to-br from-purple-50 to-blue-50 p-4">
                        {/* Header */}
                        <div className="text-center mb-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl mx-auto mb-3 flex items-center justify-center">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </div>
                          <h3 className="font-bold text-foreground text-sm">AeroEdu Vision</h3>
                          <p className="text-xs text-muted-foreground">{t('landing.mock.gradingAssistant')}</p>
                        </div>
                        
                        {/* Stats Cards */}
                        <div className="space-y-2 mb-4">
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-foreground">{t('landing.mock.examMath')}</span>
                              <span className="text-xs text-green-600 font-bold">8.5/10</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div className="bg-green-500 h-1.5 rounded-full" style={{width: '85%'}}></div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{t('landing.mock.feedback1')}</p>
                          </div>
                          
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-foreground">{t('landing.mock.examLit')}</span>
                              <span className="text-xs text-blue-600 font-bold">7.0/10</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div className="bg-blue-500 h-1.5 rounded-full" style={{width: '70%'}}></div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{t('landing.mock.feedback2')}</p>
                          </div>
                          
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-foreground">{t('landing.mock.examPhys')}</span>
                              <span className="text-xs text-purple-600 font-bold">9.2/10</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div className="bg-purple-500 h-1.5 rounded-full" style={{width: '92%'}}></div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{t('landing.mock.feedback3')}</p>
                          </div>
                        </div>
                        
                        {/* Action Button */}
                        <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded-lg text-sm font-semibold shadow-lg">
                          {t('landing.mock.newScan')}
                        </button>
                      </div>
                      
                      {/* Home indicator */}
                      <div className="h-6 bg-white rounded-b-2xl flex items-center justify-center">
                        <div className="w-20 h-1 bg-gray-800 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Floating badges */}
                <div className="absolute -left-6 -top-6 rounded-2xl border border-border bg-card p-4 shadow-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <Star className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{t('landing.mock.ratingLabel')}</p>
                      <p className="font-bold text-foreground text-lg">4.8/5</p>
                      <p className="text-xs text-muted-foreground">{t('landing.mock.reviews')}</p>
                    </div>
                  </div>
                </div>
                
                <div className="absolute -bottom-6 -right-6 rounded-2xl border border-border bg-card p-4 shadow-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{t('landing.mock.downloads')}</p>
                      <p className="font-bold text-foreground text-lg">10K+</p>
                      <p className="text-xs text-muted-foreground">{t('landing.mock.thisMonth')}</p>
                    </div>
                  </div>
                </div>
                
                <div className="absolute -left-8 top-1/2 rounded-xl border border-border bg-card p-3 shadow-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('landing.mock.accuracyLabel')}</p>
                      <p className="font-bold text-foreground">95%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tech Stack Section ── */}
      <section className="py-20 bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 relative overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Heading */}
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-4"
              style={{ background: "rgba(120,100,255,0.15)", color: "hsl(245,85%,72%)", border: "1px solid rgba(120,100,255,0.25)" }}>
              {t('landing.tech.badge')}
            </span>
            <h2 className="text-4xl font-bold text-white mb-4">
              {t('landing.tech.titleBefore')}{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">{t('landing.tech.titleHighlight')}</span>
            </h2>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto">
              {t('landing.tech.subtitle')}
            </p>
          </div>

          {/* Platform tabs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Web App */}
            <div className="rounded-2xl p-6 border"
              style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.3)" }}>
                  🌐
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Web App</h3>
                  <p className="text-xs text-muted-foreground">{t('landing.tech.webSubtitle')}</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { name: "Next.js 15", desc: "App Router + Server Components", color: "text-white", dot: "bg-white" },
                  { name: "React 18", desc: "Concurrent rendering", color: "text-sky-300", dot: "bg-sky-400" },
                  { name: "TypeScript", desc: "Type-safe codebase", color: "text-blue-300", dot: "bg-blue-400" },
                  { name: "TailwindCSS", desc: "Utility-first styling", color: "text-cyan-300", dot: "bg-cyan-400" },
                  { name: "Prisma + PostgreSQL", desc: "Database ORM", color: "text-emerald-300", dot: "bg-emerald-400" },
                  { name: "NextAuth v4", desc: "Authentication", color: "text-purple-300", dot: "bg-purple-400" },
                ].map((row) => (
                  <div key={row.name} className="flex items-start gap-3 group">
                    <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${row.dot}`} />
                    <div>
                      <span className={`text-sm font-semibold ${row.color}`}>{row.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{row.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop App */}
            <div className="rounded-2xl p-6 border relative"
              style={{ background: "rgba(120,100,255,0.06)", borderColor: "rgba(120,100,255,0.25)" }}>
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: "rgba(120,100,255,0.25)", color: "hsl(245,85%,75%)", border: "1px solid rgba(120,100,255,0.35)" }}>
                NEW
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: "rgba(120,100,255,0.2)", border: "1px solid rgba(120,100,255,0.35)" }}>
                  🖥️
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Desktop App</h3>
                  <p className="text-xs text-muted-foreground">Windows · macOS · Linux</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { name: "Tauri 2", href: "https://tauri.app/", desc: "Rust backend + WebView frontend", color: "text-orange-300", dot: "bg-orange-400" },
                  { name: "ScreenCaptureKit", href: "https://developer.apple.com/documentation/screencapturekit", desc: "macOS system audio capture", color: "text-pink-300", dot: "bg-pink-400" },
                  { name: "cpal", href: "https://github.com/RustAudio/cpal", desc: "Cross-platform microphone input", color: "text-yellow-300", dot: "bg-yellow-400" },
                  { name: "Soniox", href: "https://soniox.com", desc: "Real-time STT + translation API", color: "text-sky-300", dot: "bg-sky-400" },
                  { name: "ElevenLabs", href: "https://elevenlabs.io", desc: "Flash v2.5 TTS narration", color: "text-violet-300", dot: "bg-violet-400" },
                  { name: "Vanilla HTML/CSS/JS", desc: "Lightweight WebView frontend", color: "text-gray-300", dot: "bg-gray-400" },
                ].map((row) => (
                  <div key={row.name} className="flex items-start gap-3">
                    <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${row.dot}`} />
                    <div>
                      {row.href ? (
                        <a href={row.href} target="_blank" rel="noopener noreferrer"
                          className={`text-sm font-semibold ${row.color} hover:underline underline-offset-2`}>
                          {row.name}
                        </a>
                      ) : (
                        <span className={`text-sm font-semibold ${row.color}`}>{row.name}</span>
                      )}
                      <span className="text-xs text-muted-foreground ml-2">{row.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile + Local AI */}
            <div className="rounded-2xl p-6 border"
              style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: "rgba(16,185,129,0.18)", border: "1px solid rgba(16,185,129,0.3)" }}>
                  📱
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Mobile App + Local AI</h3>
                  <p className="text-xs text-muted-foreground">On-device inference · Privacy first</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { name: "Tauri 2 Mobile", href: "https://tauri.app/", desc: "iOS & Android packaging", color: "text-orange-300", dot: "bg-orange-400" },
                  { name: "MLX", href: "https://github.com/ml-explore/mlx", desc: "Apple ML framework on-device", color: "text-pink-300", dot: "bg-pink-400" },
                  { name: "Whisper", href: "https://github.com/openai/whisper", desc: "Local speech recognition model", color: "text-emerald-300", dot: "bg-emerald-400" },
                  { name: "Gemma", href: "https://ai.google.dev/gemma", desc: "Local translation LLM", color: "text-blue-300", dot: "bg-blue-400" },
                  { name: "cpal", href: "https://github.com/RustAudio/cpal", desc: "Cross-platform mic input", color: "text-yellow-300", dot: "bg-yellow-400" },
                  { name: "Soniox Cloud", href: "https://soniox.com", desc: "Cloud STT fallback mode", color: "text-sky-300", dot: "bg-sky-400" },
                ].map((row) => (
                  <div key={row.name} className="flex items-start gap-3">
                    <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${row.dot}`} />
                    <div>
                      {row.href ? (
                        <a href={row.href} target="_blank" rel="noopener noreferrer"
                          className={`text-sm font-semibold ${row.color} hover:underline underline-offset-2`}>
                          {row.name}
                        </a>
                      ) : (
                        <span className={`text-sm font-semibold ${row.color}`}>{row.name}</span>
                      )}
                      <span className="text-xs text-muted-foreground ml-2">{row.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Local vs Cloud badge */}
              <div className="mt-5 pt-4 border-t flex items-center justify-between"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <span className="text-[11px] px-2 py-1 rounded-full font-medium"
                  style={{ background: "rgba(16,185,129,0.15)", color: "rgb(52,211,153)", border: "1px solid rgba(16,185,129,0.25)" }}>
                  {t('landing.tech.localMode')}
                </span>
                <span className="text-[11px] px-2 py-1 rounded-full font-medium"
                  style={{ background: "rgba(99,102,241,0.15)", color: "rgb(165,180,252)", border: "1px solid rgba(99,102,241,0.25)" }}>
                  {t('landing.tech.cloudMode')}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom badge row */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: "🦀", labelKey: "landing.tech.badge.rust" },
              { icon: "⚡", labelKey: "landing.tech.badge.wasm" },
              { icon: "🍎", labelKey: "landing.tech.badge.silicon" },
              { icon: "🔒", labelKey: "landing.tech.badge.privacy" },
              { icon: "🌐", labelKey: "landing.tech.badge.cross" },
              { icon: "🤖", labelKey: "landing.tech.badge.ondevice" },
            ].map((b) => (
              <div key={b.labelKey} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span>{b.icon}</span>
                <span>{t(b.labelKey)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-background py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              {t('landing.testimonials.title')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('landing.testimonials.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-purple-50 p-8 dark:border-blue-900/40 dark:from-blue-950/50 dark:to-purple-950/50">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">NT</span>
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-foreground">{t('landing.testimonials.t1.name')}</h4>
                  <p className="text-sm text-muted-foreground">{t('landing.testimonials.t1.role')}</p>
                </div>
              </div>
              <p className="text-foreground mb-4">
                {t('landing.testimonials.t1.quote')}
              </p>
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="ml-2 text-sm text-muted-foreground">5.0</span>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-8 dark:border-green-900/40 dark:from-green-950/50 dark:to-emerald-950/50">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">PT</span>
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-foreground">{t('landing.testimonials.t2.name')}</h4>
                  <p className="text-sm text-muted-foreground">{t('landing.testimonials.t2.role')}</p>
                </div>
              </div>
              <p className="text-foreground mb-4">
                {t('landing.testimonials.t2.quote')}
              </p>
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="ml-2 text-sm text-muted-foreground">5.0</span>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 p-8 dark:border-purple-900/40 dark:from-purple-950/50 dark:to-pink-950/50">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">LH</span>
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-foreground">{t('landing.testimonials.t3.name')}</h4>
                  <p className="text-sm text-muted-foreground">{t('landing.testimonials.t3.role')}</p>
                </div>
              </div>
              <p className="text-foreground mb-4">
                {t('landing.testimonials.t3.quote')}
              </p>
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="ml-2 text-sm text-muted-foreground">5.0</span>
              </div>
            </div>
          </div>

          {/* Use Cases */}
          <div className="mt-20">
            <h3 className="text-3xl font-bold text-foreground text-center mb-12">
              {t('landing.useCases.title')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">{t('landing.useCases.uc1t')}</h4>
                <p className="text-muted-foreground text-sm">{t('landing.useCases.uc1d')}</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">{t('landing.useCases.uc2t')}</h4>
                <p className="text-muted-foreground text-sm">{t('landing.useCases.uc2d')}</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">{t('landing.useCases.uc3t')}</h4>
                <p className="text-muted-foreground text-sm">{t('landing.useCases.uc3d')}</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">{t('landing.useCases.uc4t')}</h4>
                <p className="text-muted-foreground text-sm">{t('landing.useCases.uc4d')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-black py-20 dark:bg-zinc-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            {t('landing.cta.title')}
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            {t('landing.cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => router.push('/auth/signup')}
              className="flex items-center justify-center rounded-xl bg-white px-8 py-4 font-semibold text-black transition-all hover:bg-gray-100"
            >
              {t('landing.cta.free')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
            <button 
              onClick={() => router.push('/contact-sales')}
              className="border border-gray-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 transition-all flex items-center justify-center"
            >
              {t('landing.nav.contactSales')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-6">
            {t('landing.hero.agreePrefix')}{' '}
            <a href="/terms" className="text-white hover:underline">{t('landing.hero.terms')}</a>
            {' '}{t('landing.hero.and')}{' '}
            <a href="/privacy" className="text-white hover:underline">{t('landing.hero.privacy')}</a>
            {t('landing.hero.agreeSuffix')}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-foreground">AeroEdu</span>
              </div>
              <p className="text-muted-foreground text-sm">
                {t('landing.footer.tagline')}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">{t('footer.products')}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">AI Tutor</a></li>
                <li><a href="#" className="hover:text-foreground">Learning Path</a></li>
                <li><a href="#" className="hover:text-foreground">{t('analytics.title')}</a></li>
                <li><a href="#" className="hover:text-foreground">API</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">{t('landing.footer.solutions')}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">{t('landing.footer.schools')}</a></li>
                <li><a href="#" className="hover:text-foreground">{t('landing.footer.orgs')}</a></li>
                <li><a href="#" className="hover:text-foreground">{t('landing.footer.individual')}</a></li>
                <li><a href="#" className="hover:text-foreground">Enterprise</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">{t('footer.support')}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">{t('landing.footer.helpCenter')}</a></li>
                <li><a href="#" className="hover:text-foreground">{t('landing.footer.docs')}</a></li>
                <li><a href="#" className="hover:text-foreground">{t('landing.footer.contact')}</a></li>
                <li><a href="#" className="hover:text-foreground">{t('landing.footer.status')}</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
            <p className="text-sm text-muted-foreground">
              {t('landing.footer.copyright')}
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="/terms" className="text-sm text-muted-foreground hover:text-foreground">{t('landing.footer.termsShort')}</a>
              <a href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">{t('landing.footer.privacyShort')}</a>
              <a href="/cookies" className="text-sm text-muted-foreground hover:text-foreground">{t('footer.cookies')}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}