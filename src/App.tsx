import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/context/AuthContext";
import AuthModalController from "@/components/AuthModalController";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import MockTest from "./pages/MockTest";
import TestLibrary from "./pages/TestLibrary";
import TestHistory from "./pages/TestHistory";
import Profile from "./pages/Profile";
import Pricing from "./pages/Pricing";
import InterviewRoom from "./pages/InterviewRoom";
import InterviewAnalysis from "./pages/InterviewAnalysis";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";

import ForgotPassword from "@/pages/Forgotpassword";
import ResetPassword from "@/pages/Resetpassword";

import About from "@/pages/About";
import LimaBot from "@/components/LimaBot";
import Checkout from "./pages/Checkout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          {/*
            AuthModalController mounts once here.
            It registers the modal with AuthContext so any component
            can call requireAuth() to trigger the login/signup modal.
          */}
          <AuthModalController />

          {/* LimaBot shows on every page */}
          <LimaBot />

          <Routes>
            {/* ── PUBLIC — no auth needed ─────────────────────────────── */}
            <Route path="/"                  element={<Landing />} />
            <Route path="/login"             element={<Login />} />
            <Route path="/signup"            element={<Signup />} />
            <Route path="/forgot-password"   element={<ForgotPassword />} />
            <Route path="/reset-password"    element={<ResetPassword />} />
            <Route path="/about"             element={<About />} />
            <Route path="/pricing"           element={<Pricing />} />

            {/* ── SOFT GATED — viewable, modal triggers on feature use ─ */}
            {/* These pages render for everyone but use requireAuth()     */}
            {/* internally when the user tries to DO something.           */}
            <Route path="/dashboard"         element={<Dashboard />} />
            <Route path="/test-library"      element={<TestLibrary />} />
            <Route path="/mock-test"         element={<MockTest />} />
            <Route path="/ai-interview"      element={<InterviewRoom />} />

            {/* ── HARD PROTECTED — must be logged in ──────────────────── */}
            <Route path="/test-history"      element={<ProtectedRoute><TestHistory /></ProtectedRoute>} />
            <Route path="/profile"           element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/checkout"          element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/ai-interview/room" element={<ProtectedRoute><InterviewRoom /></ProtectedRoute>} />
            <Route path="/ai-interview/analysis" element={<ProtectedRoute><InterviewAnalysis /></ProtectedRoute>} />

            {/* ── ADMIN ────────────────────────────────────────────────── */}
            <Route path="/admin/dashboard"   element={<AdminRoute><AdminDashboard /></AdminRoute>} />

            {/* ── 404 ─────────────────────────────────────────────────── */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;