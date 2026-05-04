import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="skeleton-wrapper" [ngStyle]="wrapperStyle()">
      @for (row of rows(); track $index) {
        <div class="skeleton-line"
             [ngStyle]="{
               width: widths()[$index % widths().length],
               height: height(),
               'border-radius': radius()
             }">
        </div>
      }
    </div>
  `,
  styles: [`
    .skeleton-wrapper {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .skeleton-line {
      background: linear-gradient(
        90deg,
        rgba(0, 0, 0, 0.06) 25%,
        rgba(0, 0, 0, 0.12) 37%,
        rgba(0, 0, 0, 0.06) 63%
      );
      background-size: 400% 100%;
      animation: shimmer 1.4s ease infinite;
    }

    @keyframes shimmer {
      0% { background-position: 100% 50%; }
      100% { background-position: 0 50%; }
    }
  `]
})
export class SkeletonLoaderComponent {
  count = input(3);
  height = input('16px');
  widths = input<string[]>(['100%', '80%', '60%']);
  radius = input('4px');
  wrapperStyle = input<Record<string, string>>({});

  rows(): number[] {
    return Array.from({ length: this.count() });
  }
}
