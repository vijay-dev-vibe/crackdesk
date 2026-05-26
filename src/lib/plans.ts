// config/plans.ts
// Complete plan configuration with all features for testing before payment integration

export const PLAN_LIMITS = {
  free: {
    name: "Free",
    displayName: "Free Trial",
    price: {
      monthly: 0,
      annual: 0,
    },
    
    // One-time limits for free tier (not monthly)
    isOneTime: true,
    
    // Test & Interview Limits
    maxMockTestsPerMonth: 2, // One-time, not monthly
    maxAIInterviewsPerMonth: 1, // One-time, not monthly
    maxConcurrentTests: 1,
    
    // AI & Quality Settings
    aiQuality: "basic" as const,
    
    // Feature Access
    features: {
      // Score & Reports
      fullScoreReport: false, // Only basic scores
      scoreReportPDF: false,
      
      // Analytics & Tracking
      dashboard: false,
      history: true,
      historyRetentionDays: 7, // Only last 7 days
      skillBreakdown: false,
      progressTracking: false,
      weeklyActivityChart: false,
      scoreDistribution: false,
      performanceTrends: false,
      
      // Customization
      avatarChoices: 1,
      customTemplates: false,
      customQuestions: false,
      
      // Additional Features
      certificateDownload: false,
      priorityGeneration: false,
      exportResults: false,
      emailSupport: false,
      chatSupport: false,
      expertReview: false,
      teamFeatures: false,
    }
  },
  
  starter: {
    name: "Starter",
    displayName: "Starter Plan",
    price: {
      monthly: 99,
      annual: 949,
    },
    
    isOneTime: false, // Monthly recurring
    
    // Test & Interview Limits
    maxMockTestsPerMonth: 8,
    maxAIInterviewsPerMonth: 2,
    maxConcurrentTests: 2,
    
    // AI & Quality Settings
    aiQuality: "standard" as const,
    
    // Feature Access
    features: {
      // Score & Reports
      fullScoreReport: true,
      scoreReportPDF: false,
      
      // Analytics & Tracking
      dashboard: false, // Key upgrade trigger to Pro
      history: true,
      historyRetentionDays: 30,
      skillBreakdown: true, // Basic skill analysis
      progressTracking: false,
      weeklyActivityChart: false,
      scoreDistribution: false,
      performanceTrends: false,
      
      // Customization
      avatarChoices: 2,
      customTemplates: false,
      customQuestions: false,
      
      // Additional Features
      certificateDownload: false,
      priorityGeneration: false,
      exportResults: false,
      emailSupport: true,
      chatSupport: false,
      expertReview: false,
      teamFeatures: false,
    }
  },
  
  pro: {
    name: "Pro",
    displayName: "Pro Plan ⭐",
    price: {
      monthly: 199,
      annual: 1899,
    },
    
    isOneTime: false,
    
    // Test & Interview Limits
    maxMockTestsPerMonth: 20,
    maxAIInterviewsPerMonth: 5,
    maxConcurrentTests: 5,
    
    // AI & Quality Settings
    aiQuality: "advanced" as const,
    
    // Feature Access
    features: {
      // Score & Reports
      fullScoreReport: true,
      scoreReportPDF: true,
      
      // Analytics & Tracking - UNLOCKED HERE
      dashboard: true, // ✅ Full dashboard
      history: true,
      historyRetentionDays: Infinity, // Unlimited
      skillBreakdown: true,
      progressTracking: true,
      weeklyActivityChart: true,
      scoreDistribution: true,
      performanceTrends: true,
      
      // Customization
      avatarChoices: 4,
      customTemplates: false,
      customQuestions: false,
      
      // Additional Features
      certificateDownload: true,
      priorityGeneration: true,
      exportResults: true,
      emailSupport: true,
      chatSupport: false,
      expertReview: false,
      teamFeatures: false,
    }
  },
  
  premium: {
    name: "Premium",
    displayName: "Premium Plan 👑",
    price: {
      monthly: 349,
      annual: 3349,
    },
    
    isOneTime: false,
    
    // Test & Interview Limits
    maxMockTestsPerMonth: 40,
    maxAIInterviewsPerMonth: 10,
    maxConcurrentTests: 10,
    
    // AI & Quality Settings
    aiQuality: "premium" as const,
    
    // Feature Access
    features: {
      // Score & Reports
      fullScoreReport: true,
      scoreReportPDF: true,
      
      // Analytics & Tracking
      dashboard: true,
      history: true,
      historyRetentionDays: Infinity,
      skillBreakdown: true,
      progressTracking: true,
      weeklyActivityChart: true,
      scoreDistribution: true,
      performanceTrends: true,
      
      // Customization
      avatarChoices: Infinity, // All avatars
      customTemplates: true,
      customQuestions: true,
      
      // Additional Features
      certificateDownload: true,
      priorityGeneration: true,
      exportResults: true,
      emailSupport: true,
      chatSupport: true,
      expertReview: true,
      teamFeatures: true,
      apiAccess: true,
      earlyAccess: true,
    }
  }
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

// Helper Functions

/**
 * Check if user can access a specific feature
 */
export function canUserAccess(
  userPlan: PlanType,
  feature: keyof typeof PLAN_LIMITS[PlanType]['features']
): boolean {
  const plan = PLAN_LIMITS[userPlan];
  return (plan.features as any)[feature] === true;
}

/**
 * Get remaining tests for user
 */
export function getRemainingTests(
  userPlan: PlanType,
  usedTests: number
): number | 'unlimited' {
  const limit = PLAN_LIMITS[userPlan].maxMockTestsPerMonth;
  if (limit === Infinity) return 'unlimited';
  return Math.max(0, limit - usedTests);
}

/**
 * Get remaining AI interviews for user
 */
export function getRemainingInterviews(
  userPlan: PlanType,
  usedInterviews: number
): number | 'unlimited' {
  const limit = PLAN_LIMITS[userPlan].maxAIInterviewsPerMonth;
  if (limit === Infinity) return 'unlimited';
  return Math.max(0, limit - usedInterviews);
}

/**
 * Check if user has hit their limit
 */
export function hasHitLimit(
  userPlan: PlanType,
  usedCount: number,
  limitType: 'mockTests' | 'aiInterviews'
): boolean {
  const limit = limitType === 'mockTests' 
    ? PLAN_LIMITS[userPlan].maxMockTestsPerMonth
    : PLAN_LIMITS[userPlan].maxAIInterviewsPerMonth;
  
  if (limit === Infinity) return false;
  return usedCount >= limit;
}

/**
 * Get upgrade suggestions based on usage
 */
export function getUpgradeSuggestion(
  currentPlan: PlanType,
  usageData: {
    mockTestsUsed: number;
    aiInterviewsUsed: number;
    daysActive: number;
    requestedDashboard?: boolean;
  }
): { shouldSuggest: boolean; targetPlan: PlanType | null; reason: string } {
  
  // Free users
  if (currentPlan === 'free') {
    const limits = PLAN_LIMITS.free;
    if (usageData.mockTestsUsed >= limits.maxMockTestsPerMonth || 
        usageData.aiInterviewsUsed >= limits.maxAIInterviewsPerMonth) {
      return {
        shouldSuggest: true,
        targetPlan: 'starter',
        reason: "You've used all your free tests. Upgrade to Starter for 8 tests/month!"
      };
    }
    if (usageData.daysActive >= 7) {
      return {
        shouldSuggest: true,
        targetPlan: 'starter',
        reason: "Your free trial results expire in 7 days. Upgrade to keep your progress!"
      };
    }
  }
  
  // Starter users
  if (currentPlan === 'starter') {
    if (usageData.requestedDashboard || usageData.mockTestsUsed >= 6) {
      return {
        shouldSuggest: true,
        targetPlan: 'pro',
        reason: "Unlock the full dashboard to track your improvement trends!"
      };
    }
    if (usageData.daysActive >= 21) {
      return {
        shouldSuggest: true,
        targetPlan: 'pro',
        reason: "You've been practicing for 3 weeks! See your progress with Pro's analytics."
      };
    }
  }
  
  // Pro users
  if (currentPlan === 'pro') {
    if (usageData.mockTestsUsed >= 18) {
      return {
        shouldSuggest: true,
        targetPlan: 'premium',
        reason: "You're using Pro heavily! Get 2x tests + expert reviews with Premium."
      };
    }
  }
  
  return { shouldSuggest: false, targetPlan: null, reason: '' };
}

/**
 * Calculate days until history expires
 */
export function getHistoryExpiryDays(
  userPlan: PlanType,
  recordCreatedDate: Date
): number | null {
  const retentionDays = PLAN_LIMITS[userPlan].features.historyRetentionDays;
  
  if (retentionDays === Infinity) return null;
  
  const daysSinceCreated = Math.floor(
    (Date.now() - recordCreatedDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return Math.max(0, retentionDays - daysSinceCreated);
}