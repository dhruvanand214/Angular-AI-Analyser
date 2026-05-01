import { Injectable, signal } from '@angular/core';
import axios from 'axios';

export type AnalysisMode = 'ats' | 'jd' | null;

@Injectable({ providedIn: 'root' })
export class AnalysisStateService {
  mode = signal<AnalysisMode>(null);
  loading = signal(false);
  errorMessage = signal('');
  analysis = signal<any>(null);
  hasActiveFlow = signal(false);

  private readonly baseUrl = 'https://atsify.onrender.com';

  resetToHome() {
    this.mode.set(null);
    this.loading.set(false);
    this.errorMessage.set('');
    this.analysis.set(null);
    this.hasActiveFlow.set(false);
  }

  startAnotherCheck() {
    this.loading.set(false);
    this.errorMessage.set('');
    this.analysis.set(null);
    this.hasActiveFlow.set(true);
  }

  async analyzeAts(base64File: string) {
    this.loading.set(true);
    this.errorMessage.set('');
    this.analysis.set(null);
    this.mode.set('ats');
    this.hasActiveFlow.set(true);

    try {
      const res = await axios.post(`${this.baseUrl}/analyze`, { file: base64File }, { timeout: 45000 });
      this.analysis.set(res.data);
    } catch (error: any) {
      console.error('ATS analysis failed:', error);

      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Something went wrong. Please try again.';

      this.errorMessage.set(message);
    } finally {
      this.loading.set(false);
    }
  }

  async analyzeJd(base64File: string, jobDescription: string) {
    this.loading.set(true);
    this.errorMessage.set('');
    this.analysis.set(null);
    this.mode.set('jd');
    this.hasActiveFlow.set(true);

    try {
      const res = await axios.post(
        `${this.baseUrl}/analyze-jd`,
        { file: base64File, jobDescription },
        { timeout: 60000 }
      );
      this.analysis.set(res.data);
    } catch (error: any) {
      console.error('ATS analysis failed:', error);

      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Something went wrong. Please try again.';

      this.errorMessage.set(message);
    } finally {
      this.loading.set(false);
    }
  }
}

