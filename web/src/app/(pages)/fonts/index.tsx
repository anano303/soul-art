// Since FiraGO is not available in Google Fonts, we'll optimize @fontsource usage
// Remove all font imports from this file and handle in globals.css with @fontsource/firago

// Export a variable name for consistency, but actual font loading happens in CSS
export const firago = {
  variable: "--font-firago",
  className: "font-firago",
};
