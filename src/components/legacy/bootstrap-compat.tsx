'use client';

/**
 * Internal compatibility layer exposing the react-bootstrap API surface still
 * used by legacy screens (superadmin, wizard, onboarding), implemented purely
 * with Mantine. This exists so `bootstrap`/`react-bootstrap` can be removed
 * from package.json before every legacy screen is redesigned.
 *
 * DO NOT use in new code — import @mantine/core directly. Files importing this
 * module are pending a real Mantine redesign; shrink this layer as they migrate.
 */

import React, { createContext, useContext } from 'react';
import {
  Modal as MModal,
  Button as MButton,
  Alert as MAlert,
  Badge as MBadge,
  Loader,
  Table as MTable,
  Progress,
  TextInput,
  Textarea,
  NativeSelect,
  Checkbox,
  Switch,
  Grid,
  Menu,
} from '@mantine/core';

// ── variant mapping ──────────────────────────────────────────────────────────

type BsVariant = string | undefined;

interface BaseProps extends Record<string, any> {
  onClick?: React.MouseEventHandler<any>;
  onMouseEnter?: React.MouseEventHandler<any>;
  onMouseLeave?: React.MouseEventHandler<any>;
}

function variantToColor(variant: BsVariant): string {
  const v = (variant ?? 'primary').replace('outline-', '');
  switch (v) {
    case 'primary': return 'datiaBlue';
    case 'secondary': return 'gray';
    case 'success': return 'green';
    case 'danger': return 'red';
    case 'warning': return 'yellow';
    case 'info': return 'cyan';
    case 'dark': return 'dark';
    case 'light': return 'gray';
    default: return 'datiaBlue';
  }
}

function isOutline(variant: BsVariant): boolean {
  return (variant ?? '').startsWith('outline-');
}

// ── Button ───────────────────────────────────────────────────────────────────

interface BtnProps extends Record<string, any> {
  onClick?: React.MouseEventHandler<HTMLElement>;
}

export function Button({ variant, size, href, children, className, active: _active, ...rest }: BtnProps) {
  const mVariant =
    variant === 'link' ? 'subtle'
    : variant === 'light' ? 'default'
    : isOutline(variant) ? 'light'
    : 'filled';
  return (
    <MButton
      component={href ? 'a' : undefined}
      href={href}
      variant={mVariant}
      color={variant === 'light' ? undefined : variantToColor(variant)}
      size={size === 'sm' ? 'xs' : size === 'lg' ? 'md' : 'sm'}
      className={className}
      {...rest}
    >
      {children}
    </MButton>
  );
}

// ── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ size, variant, className, children: _children, animation: _a, role: _r, ...rest }: any) {
  return (
    <Loader
      size={size === 'sm' ? 'xs' : 'sm'}
      color={variant ? variantToColor(variant) : undefined}
      className={className}
      {...rest}
    />
  );
}

// ── Badge ────────────────────────────────────────────────────────────────────

export function Badge({ bg, text: _text, pill, children, className, ...rest }: BaseProps) {
  return (
    <MBadge color={variantToColor(bg)} radius={pill ? 'xl' : 'sm'} className={className} {...rest}>
      {children}
    </MBadge>
  );
}

// ── Alert ────────────────────────────────────────────────────────────────────

function AlertHeading({ children }: any) {
  return <div style={{ fontWeight: 600, marginBottom: 6 }}>{children}</div>;
}

export function Alert({ variant, dismissible, onClose, children, className, ...rest }: any) {
  return (
    <MAlert
      color={variantToColor(variant)}
      withCloseButton={dismissible}
      onClose={onClose}
      className={className}
      mb="md"
      {...rest}
    >
      {children}
    </MAlert>
  );
}
Alert.Heading = AlertHeading;

// ── Modal ────────────────────────────────────────────────────────────────────

const ModalCtx = createContext<{ onHide?: () => void }>({});

export function Modal({ show, onHide, size, centered = true, children, className, backdrop: _b, keyboard: _k, ...rest }: any) {
  return (
    <ModalCtx.Provider value={{ onHide }}>
      <MModal
        opened={!!show}
        onClose={onHide ?? (() => {})}
        size={size === 'xl' ? 'xl' : size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'}
        centered={centered}
        withCloseButton={false}
        padding={0}
        className={className}
        {...rest}
      >
        {children}
      </MModal>
    </ModalCtx.Provider>
  );
}

function ModalHeader({ closeButton, children, className }: any) {
  const { onHide } = useContext(ModalCtx);
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: '1px solid var(--mantine-color-default-border)',
      }}
    >
      <div style={{ fontWeight: 600 }}>{children}</div>
      {closeButton && (
        <button
          type="button"
          onClick={onHide}
          aria-label="Cerrar"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, color: 'var(--mantine-color-dimmed)' }}
        >
          ×
        </button>
      )}
    </div>
  );
}
function ModalTitle({ children, className }: any) {
  return <span className={className} style={{ fontSize: 16, fontWeight: 600 }}>{children}</span>;
}
function ModalBody({ children, className, ...rest }: BaseProps) {
  return <div className={className} style={{ padding: 16 }} {...rest}>{children}</div>;
}
function ModalFooter({ children, className }: any) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 8,
        padding: '12px 16px',
        borderTop: '1px solid var(--mantine-color-default-border)',
      }}
    >
      {children}
    </div>
  );
}
Modal.Header = ModalHeader;
Modal.Title = ModalTitle;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

// ── Card ─────────────────────────────────────────────────────────────────────

export function Card({ children, className, ...rest }: BaseProps) {
  return (
    <div
      className={className}
      style={{
        border: '1px solid var(--mantine-color-default-border)',
        borderRadius: 8,
        background: 'var(--mantine-color-body)',
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
Card.Body = function CardBody({ children, className, ...rest }: BaseProps) {
  return <div className={className} style={{ padding: 16 }} {...rest}>{children}</div>;
};
Card.Header = function CardHeader({ children, className, ...rest }: BaseProps) {
  return (
    <div className={className} style={{ padding: '12px 16px', borderBottom: '1px solid var(--mantine-color-default-border)', fontWeight: 600 }} {...rest}>
      {children}
    </div>
  );
};
Card.Title = function CardTitle({ children, className, ...rest }: BaseProps) {
  return <div className={className} style={{ fontWeight: 600, marginBottom: 8 }} {...rest}>{children}</div>;
};
Card.Text = function CardText({ children, className, ...rest }: BaseProps) {
  return <p className={className} style={{ marginBottom: 8 }} {...rest}>{children}</p>;
};

// ── Grid (Container / Row / Col) ─────────────────────────────────────────────

export function Container({ fluid, children, className, ...rest }: BaseProps) {
  return (
    <div
      className={className}
      style={{ width: '100%', maxWidth: fluid ? undefined : 1140, margin: '0 auto', paddingLeft: 16, paddingRight: 16 }}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Row({ children, className, ...rest }: BaseProps) {
  return <Grid gutter="md" className={className} {...rest}>{children}</Grid>;
}

export function Col({ xs, sm, md, lg, xl, children, className, ...rest }: BaseProps) {
  const span: Record<string, number> = { base: xs ?? 12 };
  if (sm != null) span.sm = sm;
  if (md != null) span.md = md;
  if (lg != null) span.lg = lg;
  if (xl != null) span.xl = xl;
  return <Grid.Col span={span} className={className} {...rest}>{children}</Grid.Col>;
}

export function Stack({ gap = 2, direction, children, className, ...rest }: BaseProps) {
  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: direction === 'horizontal' ? 'row' : 'column', gap: Number(gap) * 4 }}
      {...rest}
    >
      {children}
    </div>
  );
}

// ── Table ────────────────────────────────────────────────────────────────────

export function Table({ striped, bordered, hover, responsive, size, children, className, ...rest }: any) {
  const table = (
    <MTable
      striped={!!striped}
      withTableBorder={!!bordered}
      withColumnBorders={!!bordered}
      highlightOnHover={!!hover}
      verticalSpacing={size === 'sm' ? 4 : 'sm'}
      className={className}
      {...rest}
    >
      {children}
    </MTable>
  );
  return responsive ? <div style={{ overflowX: 'auto' }}>{table}</div> : table;
}

// ── ListGroup ────────────────────────────────────────────────────────────────

export function ListGroup({ children, className, ...rest }: any) {
  return (
    <div
      className={className}
      style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8, overflow: 'hidden' }}
      {...rest}
    >
      {children}
    </div>
  );
}
ListGroup.Item = function ListGroupItem({ children, className, ...rest }: BaseProps) {
  return (
    <div
      className={className}
      style={{ padding: '10px 14px', borderBottom: '1px solid var(--mantine-color-default-border)' }}
      {...rest}
    >
      {children}
    </div>
  );
};

// ── ProgressBar ──────────────────────────────────────────────────────────────

export function ProgressBar({ now = 0, variant, label, className, ...rest }: any) {
  return (
    <Progress
      value={now}
      color={variant ? variantToColor(variant) : undefined}
      className={className}
      size={label ? 'xl' : 'md'}
      {...rest}
    />
  );
}

// ── Image ────────────────────────────────────────────────────────────────────

export function Image({ fluid, rounded, thumbnail, className, style, alt = '', ...rest }: any) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={className}
      style={{
        maxWidth: fluid || thumbnail ? '100%' : undefined,
        height: fluid ? 'auto' : undefined,
        borderRadius: rounded || thumbnail ? 6 : undefined,
        border: thumbnail ? '1px solid var(--mantine-color-default-border)' : undefined,
        padding: thumbnail ? 4 : undefined,
        ...style,
      }}
      {...rest}
    />
  );
}

// ── Dropdown ─────────────────────────────────────────────────────────────────

export function Dropdown({ children, align: _align, className, ...rest }: any) {
  return <Menu position="bottom-end" shadow="md" {...rest}><div className={className}>{children}</div></Menu>;
}
Dropdown.Toggle = function DropdownToggle({ variant, size, children, className, ...rest }: any) {
  return (
    <Menu.Target>
      <MButton
        variant={isOutline(variant) || variant === 'light' ? 'default' : 'filled'}
        color={variantToColor(variant)}
        size={size === 'sm' ? 'xs' : 'sm'}
        className={className}
        {...rest}
      >
        {children}
      </MButton>
    </Menu.Target>
  );
};
Dropdown.Menu = function DropdownMenu({ children }: any) {
  return <Menu.Dropdown>{children}</Menu.Dropdown>;
};
Dropdown.Item = function DropdownItem({ children, ...rest }: any) {
  return <Menu.Item {...rest}>{children}</Menu.Item>;
};
Dropdown.Header = function DropdownHeader({ children }: any) {
  return <Menu.Label>{children}</Menu.Label>;
};
Dropdown.Divider = function DropdownDivider() {
  return <Menu.Divider />;
};

// ── Form ─────────────────────────────────────────────────────────────────────

interface FormProps extends Record<string, any> {
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
}

interface FormControlProps extends Record<string, any> {
  onChange?: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  onFocus?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  ref?: React.Ref<any>;
}

interface FormSelectProps extends Record<string, any> {
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  ref?: React.Ref<any>;
}

interface FormCheckProps extends Record<string, any> {
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

function FormRoot({ children, className, ...rest }: FormProps) {
  return <form className={className} {...rest}>{children}</form>;
}

function FormGroup({ children, className, controlId: _c, ...rest }: any) {
  return <div className={className} style={{ marginBottom: 12 }} {...rest}>{children}</div>;
}

function FormLabel({ children, className, ...rest }: any) {
  return (
    <label className={className} style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }} {...rest}>
      {children}
    </label>
  );
}

function FormText({ children, className, ...rest }: any) {
  return (
    <div className={className} style={{ fontSize: 12, color: 'var(--mantine-color-dimmed)', marginTop: 4 }} {...rest}>
      {children}
    </div>
  );
}

const FormControl = React.forwardRef(function FormControl(
  { as, type = 'text', size, isInvalid, className, rows, ...rest }: FormControlProps,
  ref: any
) {
  if (as === 'textarea') {
    return <Textarea ref={ref} rows={rows ?? 3} error={isInvalid ? true : undefined} className={className} {...rest} />;
  }
  return (
    <TextInput
      ref={ref}
      type={type}
      size={size === 'sm' ? 'xs' : 'sm'}
      error={isInvalid ? true : undefined}
      className={className}
      {...rest}
    />
  );
}) as unknown as (props: FormControlProps) => React.ReactElement;

const FormSelect = React.forwardRef(function FormSelect(
  { size, isInvalid, className, children, ...rest }: FormSelectProps,
  ref: any
) {
  return (
    <NativeSelect
      ref={ref}
      size={size === 'sm' ? 'xs' : 'sm'}
      error={isInvalid ? true : undefined}
      className={className}
      {...rest}
    >
      {children}
    </NativeSelect>
  );
}) as unknown as (props: FormSelectProps) => React.ReactElement;

function FormCheck({ type = 'checkbox', label, className, ...rest }: FormCheckProps) {
  if (type === 'switch') {
    return <Switch label={label} className={className} {...rest} />;
  }
  return <Checkbox label={label} className={className} {...rest} />;
}

function FormControlFeedback({ type, children, className }: any) {
  return (
    <div
      className={className}
      style={{ fontSize: 12, marginTop: 4, color: type === 'invalid' ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-green-6)' }}
    >
      {children}
    </div>
  );
}

export const Form = Object.assign(FormRoot, {
  Group: FormGroup,
  Label: FormLabel,
  Text: FormText,
  Control: Object.assign(FormControl, { Feedback: FormControlFeedback }),
  Select: FormSelect,
  Check: FormCheck,
});
