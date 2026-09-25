import type * as React from 'react';
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'secondary' | 'inverse'; arrow?: boolean; href?: string }
export declare function Button(props: ButtonProps): React.ReactElement;
export interface LinkArrowProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> { children: React.ReactNode }
export declare function LinkArrow(props: LinkArrowProps): React.ReactElement;
export interface TagProps { tone?: 'neutral' | 'accent'; children: React.ReactNode }
export declare function Tag(props: TagProps): React.ReactElement;
export interface SectionHeaderProps { eyebrow?: string; title: string; lead?: string }
export declare function SectionHeader(props: SectionHeaderProps): React.ReactElement;
export interface CardProps { title: string; eyebrow?: string; cta?: string; href?: string; variant?: 'filled' | 'outline'; children?: React.ReactNode }
export declare function Card(props: CardProps): React.ReactElement;
export interface StatProps { value: string; label: string }
export declare function Stat(props: StatProps): React.ReactElement;
export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string; error?: string }
export declare function TextField(props: TextFieldProps): React.ReactElement;
declare global { interface Window { IO: { Button: typeof Button; LinkArrow: typeof LinkArrow; Tag: typeof Tag; SectionHeader: typeof SectionHeader; Card: typeof Card; Stat: typeof Stat; TextField: typeof TextField } } }
