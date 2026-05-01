import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UploadPanel } from '../../components/upload-panel/upload-panel';
import { AnalysisStateService } from '../../services/analysis-state.service';

@Component({
  selector: 'app-ats-check',
  imports: [UploadPanel],
  templateUrl: './ats-check.html',
  styleUrl: './ats-check.css'
})
export class AtsCheck {
  selectedFile = signal<File | null>(null);
  localError = signal('');

  constructor(
    private readonly analysisState: AnalysisStateService,
    private readonly router: Router
  ) {
    this.analysisState.mode.set('ats');
    this.analysisState.startAnotherCheck();
  }

  onFileSelected(file: File) {
    this.selectedFile.set(file);
    this.localError.set('');
  }

  async analyze() {
    const file = this.selectedFile();
    if (!file) {
      this.localError.set('Please upload a resume first.');
      return;
    }

    this.localError.set('');
    await this.router.navigateByUrl('/results');
    const base64 = await this.convertToBase64(file);
    await this.analysisState.analyzeAts(base64);
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

