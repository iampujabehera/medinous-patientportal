import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { SkeletonLoaderComponent } from './skeleton-loader.component';

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, SkeletonLoaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="skeleton-card" [ngClass]="variant()">
      @if (showAvatar()) {
        <div class="skeleton-header">
          <div class="skeleton-avatar"></div>
          <app-skeleton-loader [count]="2" height="14px" [widths]="['70%', '40%']" />
        </div>
      }
      <mat-card-content>
        <app-skeleton-loader [count]="lines()" [height]="lineHeight()" />
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .skeleton-card {
      margin-bottom: 16px;
      padding: 20px;
    }

    .skeleton-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }

    .skeleton-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      flex-shrink: 0;
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

    .compact {
      padding: 12px;
    }

    .compact .skeleton-avatar {
      width: 36px;
      height: 36px;
    }
  `]
})
export class SkeletonCardComponent {
  lines = input(3);
  lineHeight = input('16px');
  showAvatar = input(false);
  variant = input<'default' | 'compact'>('default');
}
