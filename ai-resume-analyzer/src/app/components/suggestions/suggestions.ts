import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-suggestions',
  imports: [CommonModule],
  templateUrl: './suggestions.html',
  styleUrl: './suggestions.css',
})
export class Suggestions {
  @Input() title!: string;
  @Input() items!: string[];
}
