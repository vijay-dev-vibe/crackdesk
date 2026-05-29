import Navbar from "@/components/Navbar";
import {
  BrainCircuit,
  Sparkles,
  ShieldCheck,
  Rocket,
  ArrowRight,
  ScanSearch,
  FileText,
  BadgeCheck,
} from "lucide-react";

import { motion } from "framer-motion";

const features = [
  {
    title: "AI Resume Analysis",
    icon: FileText,
    description:
      "Advanced AI algorithms analyze candidate resumes and evaluate technical and professional strengths.",
  },
  {
    title: "JD Matching System",
    icon: ScanSearch,
    description:
      "Intelligent comparison between resumes and job descriptions to identify role compatibility.",
  },
  {
    title: "AI Interviewer",
    icon: BrainCircuit,
    description:
      "AI-powered interviews that evaluate communication, technical ability, and confidence levels.",
  },
  {
    title: "Smart Hiring Insights",
    icon: BadgeCheck,
    description:
      "Generate powerful hiring insights and predictive candidate evaluation reports.",
  },
  {
    title: "Enterprise Security",
    icon: ShieldCheck,
    description:
      "Secure and scalable enterprise-grade architecture built for modern organizations.",
  },
  {
    title: "Future Innovation",
    icon: Rocket,
    description:
      "Futuristic software engineering focused on transforming recruitment using AI.",
  },
];

export default function About() {
  return (
    <>
      <Navbar />

      <main
        className="relative overflow-hidden pt-16 text-white"
        style={{
          fontFamily: "'Times New Roman', serif",
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.84), rgba(0,0,0,0.9)), url('https://images.unsplash.com/photo-1484417894907-623942c8ee29?q=80&w=2200&auto=format&fit=crop')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >

        {/* GOLDEN GLOW EFFECTS */}
        <div className="absolute inset-0 -z-10 overflow-hidden">

          <div className="absolute top-0 left-0 h-[500px] w-[500px] rounded-full bg-yellow-500/20 blur-[140px]" />

          <div className="absolute right-0 bottom-0 h-[500px] w-[500px] rounded-full bg-amber-500/20 blur-[140px]" />

          <div className="absolute left-1/2 top-1/3 h-[350px] w-[350px] -translate-x-1/2 rounded-full bg-yellow-300/10 blur-[120px]" />

        </div>

        {/* HERO SECTION */}
        <section className="relative flex min-h-screen items-center justify-center px-6">

          <div className="mx-auto max-w-7xl text-center">

            <motion.div
              initial={{ opacity: 0, y: 120 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
            >

              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-black/30 px-5 py-2 text-sm font-medium text-yellow-400 backdrop-blur-2xl">
                <Sparkles className="h-4 w-4" />
                AI Powered Recruitment Intelligence
              </div>

              <h1 className="mb-8 text-5xl font-black tracking-wide leading-tight md:text-7xl lg:text-8xl">
                    Map<span className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
                  Reducer
                </span>                
              </h1>

              <p className="mx-auto max-w-5xl text-lg leading-10 text-gray-300 md:text-2xl">

                The AI platform that maps your skills to the right opportunities — built by
                <span className="font-semibold text-yellow-400">
                  {" "}Minimize Technology{" "}
                </span>
              </p>

              {/* BUTTONS */}
              <div className="mt-12 flex flex-wrap items-center justify-center gap-5">

                <a href="/">

                  <button className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 px-8 py-4 text-lg font-semibold text-black transition-all duration-300 hover:scale-105 hover:shadow-[0_0_60px_rgba(234,179,8,0.5)]">

                    Explore Platform

                    <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />

                  </button>

                </a>

                <button className="rounded-full border border-yellow-500/30 bg-black/30 px-8 py-4 text-lg font-semibold text-white backdrop-blur-2xl transition-all duration-300 hover:border-yellow-500 hover:bg-yellow-500/10">
                  Learn More
                </button>

              </div>

            </motion.div>

            {/* FLOATING ICONS */}

            <motion.div
              animate={{ y: [0, -25, 0] }}
              transition={{ repeat: Infinity, duration: 5 }}
              className="absolute left-10 top-32 hidden rounded-3xl border border-yellow-500/20 bg-black/30 p-6 backdrop-blur-2xl lg:block"
            >

              <BrainCircuit className="h-14 w-14 text-yellow-400" />

            </motion.div>

            <motion.div
              animate={{ y: [0, 25, 0] }}
              transition={{ repeat: Infinity, duration: 6 }}
              className="absolute right-10 bottom-32 hidden rounded-3xl border border-yellow-500/20 bg-black/30 p-6 backdrop-blur-2xl lg:block"
            >

              <ShieldCheck className="h-14 w-14 text-yellow-400" />

            </motion.div>

          </div>

        </section>

        {/* ABOUT SECTION */}

        <section className="px-6 py-32">

          <div className="mx-auto grid max-w-7xl items-center gap-20 lg:grid-cols-2">

            {/* IMAGE */}

            <motion.div
              initial={{ opacity: 0, x: -120, rotateY: -20 }}
              whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
              className="relative"
            >

              <div className="absolute -inset-4 rounded-[40px] bg-gradient-to-r from-yellow-400/20 to-amber-600/20 blur-3xl" />

              <motion.img
                whileHover={{
                  rotateY: 8,
                  rotateX: 5,
                  scale: 1.03,
                }}
                transition={{ duration: 0.5 }}
                src="https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=1600&auto=format&fit=crop"
                alt="AI Platform"
                className="relative rounded-[40px] border border-yellow-500/20 shadow-2xl"
              />

            </motion.div>

            {/* CONTENT */}

            <motion.div
              initial={{ opacity: 0, x: 120 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
            >

              <div className="mb-4 inline-flex rounded-full border border-yellow-500/30 bg-black/30 px-4 py-2 text-sm font-medium text-yellow-400 backdrop-blur-2xl">
                About The Product
              </div>

              <h2 className="mb-8 text-4xl font-black tracking-wide leading-tight md:text-6xl">

                Intelligent Hiring

                <span className="block bg-gradient-to-r from-yellow-300 to-amber-600 bg-clip-text text-transparent">
                  Powered By AI
                </span>

              </h2>

              <p className="mb-6 text-lg leading-10 text-gray-300">

                AI Interviewer is an intelligent recruitment platform that evaluates
                whether a candidate is suitable for a specific role by deeply analyzing
                both resumes and job descriptions using advanced artificial intelligence models.

              </p>

              <p className="mb-6 text-lg leading-10 text-gray-300">

                The platform conducts AI-powered interviews, evaluates communication skills,
                technical expertise, confidence levels, and role compatibility to generate
                highly accurate hiring insights for organizations and recruiters.

              </p>

              <p className="text-lg leading-10 text-gray-300">

                Built by Minimize Technology, this platform represents our vision to
                modernize recruitment through intelligent automation, predictive hiring systems,
                and futuristic software innovation.

              </p>

            </motion.div>

          </div>

        </section>

        {/* FEATURES SECTION */}

        <section className="px-6 py-32">

          <div className="mx-auto max-w-7xl">

            <div className="mb-20 text-center">

              <div className="mb-4 inline-flex rounded-full border border-yellow-500/30 bg-black/30 px-4 py-2 text-sm font-medium text-yellow-400 backdrop-blur-2xl">
                Platform Features
              </div>

              <h2 className="mb-6 text-4xl font-black tracking-wide md:text-6xl">
                Smart Recruitment Ecosystem
              </h2>

              <p className="mx-auto max-w-4xl text-lg leading-10 text-gray-300">

                Designed with cutting-edge AI technologies to deliver an intelligent,
                scalable, and futuristic recruitment experience.

              </p>

            </div>

            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">

              {features.map((feature, index) => {
                const Icon = feature.icon;

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 120 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.7,
                      delay: index * 0.1,
                    }}
                    viewport={{ once: true }}
                    whileHover={{
                      rotateX: 6,
                      rotateY: -6,
                      scale: 1.03,
                    }}
                    className="group relative overflow-hidden rounded-[32px] border border-yellow-500/10 bg-black/30 p-8 backdrop-blur-2xl transition-all duration-500 hover:border-yellow-500/30 hover:shadow-[0_0_50px_rgba(234,179,8,0.2)]"
                  >

                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 via-yellow-500/0 to-yellow-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                    <div className="relative">

                      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/30">

                        <Icon className="h-8 w-8 text-black" />

                      </div>

                      <h3 className="mb-4 text-2xl font-bold">
                        {feature.title}
                      </h3>

                      <p className="leading-8 text-gray-300">
                        {feature.description}
                      </p>

                    </div>

                  </motion.div>
                );
              })}

            </div>

          </div>

        </section>

        {/* MISSION & VISION */}

        <section className="px-6 py-32">

          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">

            {/* MISSION */}

            <motion.div
              initial={{ opacity: 0, y: 80 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
              className="rounded-[40px] border border-yellow-500/10 bg-black/30 p-10 backdrop-blur-2xl"
            >

              <div className="mb-5 inline-flex rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm font-medium text-yellow-400">
                Our Mission
              </div>

              <h3 className="mb-6 text-4xl font-black tracking-wide">
                Simplifying Recruitment Through AI
              </h3>

              <p className="text-lg leading-10 text-gray-300">

                Our mission is to transform the hiring process using artificial intelligence
                by creating smart recruitment systems that reduce hiring complexity,
                improve candidate evaluation accuracy, and empower organizations
                with intelligent decision-making technologies.

              </p>

            </motion.div>

            {/* VISION */}

            <motion.div
              initial={{ opacity: 0, y: 80 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              viewport={{ once: true }}
              className="rounded-[40px] border border-yellow-500/10 bg-black/30 p-10 backdrop-blur-2xl"
            >

              <div className="mb-5 inline-flex rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm font-medium text-yellow-400">
                Our Vision
              </div>

              <h3 className="mb-6 text-4xl font-black tracking-wide">
                Building The Future Of Intelligent Hiring
              </h3>

              <p className="text-lg leading-10 text-gray-300">

                We envision a future where AI-driven recruitment platforms become
                the global standard for hiring, enabling businesses to identify
                the right talent faster, smarter, and more efficiently through
                intelligent automation and predictive technologies.

              </p>

            </motion.div>

          </div>

        </section>

      </main>
    </>
  );
}