import 'react';

declare module 'react' {
  interface HTMLAttributes {
    page_id?: string;
    theme_color?: string;
    attribution?: string;
  }
}
