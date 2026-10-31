'use client';

import * as React from 'react';

/*
 * Clean SVG icon primitives.
 * Replaces thin-line icon libraries (lucide-react) per the minimalist-ui skill:
 * bans generic thin-line icons; uses bold, consistent-stroke SVG primitives.
 */

type IconProps = {
  className?: string;
  size?: number;
  title?: string;
};

const Svg = (props: IconProps, ...paths: React.ReactNode[]) => (
  <svg
    role="img"
    aria-label={props.title}
    className={`shrink-0 ${props.className ?? ''}`.trim()}
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
  >
    {props.title ? <title>{props.title}</title> : null}
    {paths}
  </svg>
);

export const IconHome = (props: IconProps) =>
  Svg(props, <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1" />);

export const IconUsers = (props: IconProps) =>
  Svg(props, <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />, <circle cx="9" cy="7" r="4" />, <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />);

export const IconActivity = (props: IconProps) =>
  Svg(props, <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />);

export const IconBuilding2 = (props: IconProps) =>
  Svg(props, <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />, <path d="M3 6l9-3 9 3" />);

export const IconHelpCircle = (props: IconProps) =>
  Svg(props, <circle cx="12" cy="12" r="10" />, <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />, <path d="M12 17h.01" />);

export const IconLogOut = (props: IconProps) =>
  Svg(props, <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />, <polyline points="16 17 21 12 16 7" />, <line x1="21" y1="12" x2="9" y2="12" />);

export const IconMenu = (props: IconProps) =>
  Svg(props, <line x1="3" y1="12" x2="21" y2="12" />, <line x1="3" y1="6" x2="21" y2="6" />, <line x1="3" y1="18" x2="21" y2="18" />);

export const IconX = (props: IconProps) =>
  Svg(props, <line x1="18" y1="6" x2="6" y2="18" />, <line x1="6" y1="6" x2="18" y2="18" />);

export const IconChevronDown = (props: IconProps) =>
  Svg(props, <polyline points="6 9 12 15 18 9" />);

export const IconBarChart3 = (props: IconProps) =>
  Svg(props, <line x1="18" y1="20" x2="18" y2="10" />, <line x1="12" y1="20" x2="12" y2="4" />, <line x1="6" y1="20" x2="6" y2="14" />);

export const IconClock = (props: IconProps) =>
  Svg(props, <circle cx="12" cy="12" r="10" />, <polyline points="12 6 12 12 16 14" />);

export const IconPlus = (props: IconProps) =>
  Svg(props, <line x1="12" y1="5" x2="12" y2="19" />, <line x1="5" y1="12" x2="19" y2="12" />);

export const IconEdit3 = (props: IconProps) =>
  Svg(props, <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />, <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />);

export const IconTrash2 = (props: IconProps) =>
  Svg(props, <polyline points="3 6 5 6 21 6" />, <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />);

export const IconCheck = (props: IconProps) =>
  Svg(props, <polyline points="20 6 9 17 4 12" />);

export const IconAlertCircle = (props: IconProps) =>
  Svg(props, <circle cx="12" cy="12" r="10" />, <line x1="12" y1="8" x2="12" y2="12" />, <line x1="12" y1="16" x2="12.01" y2="16" />);

export const IconRefreshCw = (props: IconProps) =>
  Svg(props, <path d="M1 4v4a1 1 0 001 1h4" />, <path d="M7 11h4a4 4 0 004-4V3" />, <path d="M23 4v4a1 1 0 01-1 1h-4" />, <path d="M17 11h-4a4 4 0 01-4 4v4" />);

export const IconEye = (props: IconProps) =>
  Svg(props, <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />, <circle cx="12" cy="12" r="3" />);

export const IconEyeOff = (props: IconProps) =>
  Svg(props, <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.87m-6.72-1.07a3 3 0 11-4.24-4.24" />, <line x1="1" y1="1" x2="23" y2="23" />);

export const IconSave = (props: IconProps) =>
  Svg(props, <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1" />, <path d="M17 21v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v2" />);

export const IconDownload = (props: IconProps) =>
  Svg(props, <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />, <polyline points="7 10 12 15 17 10" />, <line x1="12" y1="15" x2="12" y2="3" />);

export const IconCalendar = (props: IconProps) =>
  Svg(props, <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />, <line x1="16" y1="2" x2="16" y2="6" />, <line x1="8" y1="2" x2="8" y2="6" />, <line x1="3" y1="10" x2="21" y2="10" />);

export const IconTag = (props: IconProps) =>
  Svg(props, <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 16.59a2 2 0 010-2.83l7.17-7.17a2 2 0 012.83 0l3.34 3.34a1 1 0 001.41 0z" />, <line x1="1" y1="4" x2="1" y2="10" />, <line x1="4" y1="1" x2="10" y2="1" />);

export const IconShieldCheck = (props: IconProps) =>
  Svg(props, <path d="M9 21l3-3 4 4V11c0-4.42-2-5.82-4-8-2 2.18-4 3.58-4 8z" />, <polyline points="20 6 12 13 8 6" />);

export const IconLock = (props: IconProps) =>
  Svg(props, <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />, <path d="M7 11V7a5 5 0 0110 0v4" />);

export const IconMoreHorizontal = (props: IconProps) =>
  Svg(props, <circle cx="12" cy="12" r="1" />, <circle cx="17" cy="12" r="1" />, <circle cx="7" cy="12" r="1" />);

export const IconArrowLeft = (props: IconProps) =>
  Svg(props, <line x1="19" y1="12" x2="5" y2="12" />, <polyline points="12 19 5 12 12 5" />);

export const IconArrowRight = (props: IconProps) =>
  Svg(props, <line x1="5" y1="12" x2="19" y2="12" />, <polyline points="12 5 19 12 12 19" />);

export const IconStar = (props: IconProps) =>
  Svg(props, <polyline points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />);

export const IconSearch = (props: IconProps) =>
  Svg(props, <circle cx="11" cy="11" r="8" />, <line x1="21" y1="21" x2="16.65" y2="16.65" />);

export const IconFilter = (props: IconProps) =>
  Svg(props, <polyline points="18 4 6 4 12 19" />, <path d="M18 8h-6l1-6h4l1-6h2l1 6h4z" />);

export const IconFile = (props: IconProps) =>
  Svg(props, <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />, <polyline points="13 2 13 9 20 9" />);

export const IconFolder = (props: IconProps) =>
  Svg(props, <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 2h9a2 2 0 012 2z" />);

export const IconSun = (props: IconProps) =>
  Svg(props, <circle cx="12" cy="12" r="5" />, <line x1="12" y1="1" x2="12" y2="3" />, <line x1="12" y1="21" x2="12" y2="23" />, <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />, <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />, <line x1="1" y1="12" x2="3" y2="12" />, <line x1="21" y1="12" x2="23" y2="12" />, <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />, <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />);

export const IconMoon = (props: IconProps) =>
  Svg(props, <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />);

export const IconUserCircle = (props: IconProps) =>
  Svg(props, <circle cx="12" cy="12" r="10" />, <circle cx="12" cy="8" r="3" />, <path d="M7 21c-2.83 0-5-2.17-5-5v0c0-2.83 2.17-5 5-5h4c2.83 0 5 2.17 5 5v0c0 2.83-2.17 5-5 5z" />);

export const IconLayoutGrid = (props: IconProps) =>
  Svg(props, <rect x="3" y="3" width="7" height="7" rx="1" ry="1" />, <rect x="14" y="3" width="7" height="7" rx="1" ry="1" />, <rect x="14" y="14" width="7" height="7" rx="1" ry="1" />, <rect x="3" y="14" width="7" height="7" rx="1" ry="1" />);

export const IconPieChart = (props: IconProps) =>
  Svg(props, <path d="M21.21 15.21A10 10 0 0112 2" />, <path d="M22 12A10 10 0 0112 22" />);

export const IconLayout = (props: IconProps) =>
  Svg(props, <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />, <line x1="3" y1="9" x2="21" y2="9" />, <line x1="9" y1="21" x2="9" y2="3" />);

export const IconPackage = (props: IconProps) =>
  Svg(props, <path d="M21 10l-7-4-7 4V6h14z" />, <line x1="12" y1="13" x2="12" y2="21" />, <path d="M5 12l7-4 7 4" />);

export const IconShieldAlert = (props: IconProps) =>
  Svg(props, <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />, <line x1="12" y1="8" x2="12" y2="12" />, <line x1="12" y1="16" x2="12.01" y2="16" />);

export const IconDatabase = (props: IconProps) =>
  Svg(props, <ellipse cx="12" cy="5" rx="9" ry="3" />, <path d="M3 5v12c0 1.66 3 3 9 3s9-1.34 9-3V5c0-1.66-3-3-9-3s-9 1.34-9 3z" />, <ellipse cx="12" cy="17" rx="9" ry="3" />, <path d="M3 19v-2c0-1.66 3-3 9-3s9 1.34 9 3v2" />);

export const IconWallet = (props: IconProps) =>
  Svg(props, <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />, <line x1="1" y1="10" x2="23" y2="10" />, <path d="M12 10h11M12 2h11" />);

export const IconCreditCard = IconWallet;

export const IconCamera = (props: IconProps) =>
  Svg(props, <path d="M14.96 14.96a4 4 0 010 5.66 4 4 0 01-5.66 0 4 4 0 010-5.66 4 4 0 015.66 0" />, <path d="M18.99 5.01a9 9 0 01-2.83 6.83l-2.82-2.82a4 4 0 00-5.66 0l-2.82 2.82A9 9 0 015.01 18.99l-2.83-2.83A9 9 0 012 12c0-4.71 3.58-8.58 8-8.58s8 3.86 8 8.58z" />);

export const IconImage = (props: IconProps) =>
  Svg(props, <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />, <circle cx="8.5" cy="8.5" r="1.5" />);

export const IconMapPin = (props: IconProps) =>
  Svg(props, <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0" />);

export const IconDirections = (props: IconProps) =>
  Svg(props, <path d="M5.05 6.95 17 3v6l-2 2 2 2v6l-11.95-3.95a1 1 0 01-.1-1.05A1 1 0 015 13v-6z" />);

export const IconAward = (props: IconProps) =>
  Svg(props, <path d="M10.35 18.65c0 1.33.89 2.44 2.13 2.86l2.79 1.85c.49 .32 1.05 .32 1.53 0l2.79-1.85c1.24-.42 2.13-1.53 2.13-2.86V17c0-1.14-.62-2.12-1.53-2.65l-2.79-1.39c-.48-.25-1.02-.25-1.53 0l-2.79 1.39c-.91.53-1.53 1.51-1.53 2.65v1.65z" />, <path d="M16.28 6.28a2 2 0 11-2.83 2.83L12 7l-1.45 1.45a2 2 0 11-2.83-2.83L10.5 3L12 1.5l1.5 1.5z" />);

export const IconTarget = (props: IconProps) =>
  Svg(props, <circle cx="12" cy="12" r="10" />, <circle cx="12" cy="12" r="6" />, <circle cx="12" cy="12" r="2" />);

export const IconBell = (props: IconProps) =>
  Svg(props, <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />, <path d="M13.73 21a2 2 0 01-3.46 0" />);

export const IconCopy = (props: IconProps) =>
  Svg(props, <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />, <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />);

export const IconTerminal = (props: IconProps) =>
  Svg(props, <polyline points="4 17 10 17 10 11" />, <polyline points="5 12 16 12 16 18" />, <line x1="12" y1="13" x2="12.01" y2="13" />);

export const IconMonitor = (props: IconProps) =>
  Svg(props, <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />, <line x1="12" y1="17" x2="12" y2="21" />);

export const IconHardDrive = (props: IconProps) =>
  Svg(props, <line x1="22" y1="12" x2="22" y2="4" />, <path d="M5.5 2H20v16.8A1.8 1.8 0 0118.2 20H5.8A1.8 1.8 0 014 18.8V2z" />, <line x1="6" y1="2" x2="5.2" y2="18" />);

export const IconPhone = (props: IconProps) =>
  Svg(props, <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 011.41-.15 2 2 0 010 2.81" />);

export const IconMail = (props: IconProps) =>
  Svg(props, <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />, <polyline points="22 6 12 13 2 6" />);