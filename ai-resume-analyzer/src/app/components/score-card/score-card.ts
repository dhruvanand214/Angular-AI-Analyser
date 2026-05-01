import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-score-card',
  imports: [],
  templateUrl: './score-card.html',
  styleUrl: './score-card.css',
})
export class ScoreCard {
  @Input() score!: number;
  analysis: any;

  radius = 40;
  circumference = 2 * Math.PI * this.radius;
  dashOffset = this.circumference;

  ngOnInit() {
    const progress = this.score / 100;
    this.dashOffset = this.circumference * (1 - progress);
  }
}
