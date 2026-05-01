import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UploadPanel } from '../../components/upload-panel/upload-panel';
import { AnalysisStateService } from '../../services/analysis-state.service';

@Component({
  selector: 'app-jd-check',
  imports: [UploadPanel],
  templateUrl: './jd-check.html',
  styleUrl: './jd-check.css'
})
export class JdCheck {
  selectedFile = signal<File | null>(null);
  jobDescription = signal('');
  localError = signal('');

  constructor(
    private readonly analysisState: AnalysisStateService,
    private readonly router: Router
  ) {
    this.analysisState.mode.set('jd');
    this.analysisState.startAnotherCheck();
  }

  onFileSelected(file: File) {
    this.selectedFile.set(file);
    this.localError.set('');
  }

  onJdInput(event: Event) {
    this.jobDescription.set((event.target as HTMLTextAreaElement).value ?? '');
  }

  async analyze() {
    const file = this.selectedFile();
    const jd = this.jobDescription().trim();

    if (!file) {
      this.localError.set('Please upload a resume first.');
      return;
    }
    if (!jd) {
      this.localError.set('Please paste a job description first.');
      return;
    }

    this.localError.set('');
    await this.router.navigateByUrl('/results');
    const base64 = await this.convertToBase64(file);
    await this.analysisState.analyzeJd(base64, jd);
  }

  private convertToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }
}

