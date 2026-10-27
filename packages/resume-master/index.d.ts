/**
 * Client bridge for the resume-master projection service.
 * `asOf` is not part of this contract and is never sent.
 */
export declare const DEFAULT_RESUME_SERVICE_URL: 'https://resume-master-nu.vercel.app';

export interface GetResumeOptions {
  projectIds?: readonly string[];
  workIds?: readonly string[];
  keywords?: readonly string[];
  mode?: 'strict' | 'expand';
  /** Included only when the property is present on the options object, including null. */
  cutOffDate?: string | null;
}

/**
 * POST /v1/resume and return the parsed JSON projection.
 * Throws if `apiKey` is missing. Error messages never include the key or response body.
 */
export declare function getResume(
  apiKey: string,
  options?: GetResumeOptions,
  baseUrl?: string
): Promise<unknown>;
