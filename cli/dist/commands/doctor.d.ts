/**
 * ARTK CLI - Doctor Command
 *
 * Diagnoses ARTK installation and detects variant mismatches.
 */
import type { VariantId } from '../utils/variant-types.js';
/**
 * Doctor command options.
 */
export interface DoctorOptions {
    targetPath: string;
    verbose?: boolean;
}
/**
 * Diagnostic check result.
 */
export interface DiagnosticCheck {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    details?: string;
}
/**
 * Doctor command result.
 */
export interface DoctorResult {
    healthy: boolean;
    checks: DiagnosticCheck[];
    recommendations: string[];
    installedVariant?: VariantId;
    recommendedVariant?: VariantId;
}
/**
 * Execute the doctor command.
 */
export declare function doctor(options: DoctorOptions): Promise<DoctorResult>;
/**
 * Print doctor results.
 */
export declare function printDoctorResults(result: DoctorResult, verbose?: boolean): void;
/**
 * CLI entry point for doctor command.
 */
export declare function parseDoctorArgs(args: string[]): DoctorOptions;
//# sourceMappingURL=doctor.d.ts.map