import { z } from "zod";
import { CoverageType } from "@/lib/data/schemas";

export const CaseStatusSchema = z.enum(["no_pa_yet", "pa_pending", "pa_approved", "pa_denied", "plan_excludes", "self_pay"]);

export const QuizSchema = z.object({
  coverage: CoverageType,
  insurer_id: z.string().nullable(),
  state: z.string().nullable(),
  product_id: z.string().min(1, "Pick the medicine on your prescription"),
  current_dose_mg: z.number().positive().nullable(),
  target_dose_mg: z.number().positive().nullable(),
  diagnosis_on_file: z.boolean().nullable(),
  status: CaseStatusSchema,
  current_monthly_cost_usd: z.number().min(0, "Enter zero or more").max(100000).nullable(),
  plan_copay_usd: z.number().min(0).max(100000).nullable(),
  intro_fills_used: z.number().int().min(0).max(24),
  refills_on_time: z.boolean(),
});
export type QuizValues = z.infer<typeof QuizSchema>;

export const QUIZ_DEFAULTS: Partial<QuizValues> = {
  insurer_id: null,
  state: null,
  current_dose_mg: null,
  target_dose_mg: null,
  diagnosis_on_file: null,
  current_monthly_cost_usd: null,
  plan_copay_usd: null,
  intro_fills_used: 0,
  refills_on_time: true,
};

export const COMMERCIAL = ["employer", "marketplace"] as const;
export const isCommercial = (c: string | undefined) => c === "employer" || c === "marketplace";
