// The components that are not the Button, the Tooltip or the toasts, as an app uses them: from the
// import paths of the package, with the stores and the router coming from the app.
import {
  Badge,
  Button,
  Divider,
  GradientText,
  ScrollToTop,
  Theme,
} from '@beautinique/frontend-components';
import { AuthBottomInstructions } from '@beautinique/frontend-components/auth';
import { LinearGradient } from '@beautinique/frontend-components/linear-gradient';
import { Resend } from '@beautinique/frontend-components/resend';
import { Stepper } from '@beautinique/frontend-components/stepper';
import type { TThemeStoreHook } from '@beautinique/frontend-stores';
import { type ComponentProps, useState } from 'react';

const STEPS = [
  { title: 'Account', description: 'Create your account' },
  { title: 'Address', description: 'Where to deliver', icon: 'solar:map-point-linear' },
  { title: 'Payment', description: 'Pay for the order' },
  { title: 'Review' },
];

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/** The `Link` of a router, as far as the playground needs: it asks for `to`. */
const Link = ({ to, ...rest }: ComponentProps<'a'> & { to: string }) => (
  <a href={`#${to}`} {...rest} />
);

const Section = ({ name, title, children }: ComponentProps<'section'> & { name: string }) => (
  <section className="flex flex-col gap-3" data-section={name}>
    <h2 className="text-secondary text-sm font-semibold">{title}</h2>
    {children}
  </section>
);

const RESEND_MODES = ['sync', 'async', 'fails'] as const;
type TResendMode = (typeof RESEND_MODES)[number];

export const Components = ({ themeStore }: { themeStore: TThemeStoreHook }) => {
  const [step, setStep] = useState(1);
  const [pathname, setPathname] = useState('/page-1');
  const [isSmooth, setIsSmooth] = useState(false);
  const [resendMode, setResendMode] = useState<TResendMode>('sync');
  const [resends, setResends] = useState(0);

  const onResend = async () => {
    setResends((count) => count + 1);
    if (resendMode === 'sync') return;

    await wait(1500);
    if (resendMode === 'fails') throw new Error('Could not send the code');
  };

  return (
    <>
      <Section name="theme" title="Theme">
        <div className="flex items-center gap-3">
          <Theme store={themeStore} />
          <span className="text-tertiary text-xs">
            A sun while the theme is dark, a moon while it is light. The icons move; with
            &quot;reduce motion&quot; on in the system they are still.
          </span>
        </div>
      </Section>

      <Section name="badge-divider-gradient" title="Badge, Divider, GradientText">
        <div className="flex flex-wrap items-center gap-2">
          <Badge content="New" />
          <Badge content={0} />
          <Badge content={12} />
          <Badge
            content={
              <>
                <span aria-hidden="true">★</span> Top rated
              </>
            }
          />
          <Badge content={null} data-testid="empty-badge" />
          <span className="text-tertiary text-xs">(the last one has nothing to show: no pill)</span>
        </div>
        <Divider />
        <div className="flex flex-wrap items-baseline gap-4 text-lg">
          <GradientText type="accent" text="Accent" className="font-semibold" />
          <GradientText type="silver">Silver, with children</GradientText>
          <GradientText as={Link} to="/terms" type="accent" text="A link" className="underline" />
        </div>
      </Section>

      <Section name="linear-gradient" title="LinearGradient">
        <div className="relative h-24 w-full max-w-md overflow-hidden rounded-lg border">
          <div className="flex h-full w-max items-center gap-3 overflow-x-auto px-12">
            {Array.from({ length: 12 }, (_, index) => (
              <div
                key={index}
                className="bg-primary/10 flex h-14 w-24 shrink-0 items-center justify-center rounded-md text-sm"
              >
                {index + 1}
              </div>
            ))}
          </div>
          <LinearGradient position="left" />
          <LinearGradient position="right" />
        </div>
      </Section>

      <Section name="stepper" title="Stepper">
        <Stepper
          label="Checkout progress"
          steps={STEPS.map((item, index) => ({ ...item, disabled: index === 3 }))}
          activeStep={step}
          onStepClick={setStep}
          className="border-primary/10 rounded-lg border"
        >
          <p className="text-secondary text-sm">
            Step {step + 1} of {STEPS.length}: {STEPS.at(step)?.title ?? ''} (the last step is
            disabled, it cannot be clicked)
          </p>
        </Stepper>
        <div className="flex flex-wrap gap-3">
          <div className="w-32">
            <Button
              pattern="outline"
              content="Back"
              buttonProps={{
                disabled: step <= 0,
                onClick: () => {
                  setStep((current) => current - 1);
                },
              }}
            />
          </div>
          <div className="w-32">
            <Button
              pattern="primary"
              content="Next"
              buttonProps={{
                disabled: step >= STEPS.length - 1,
                onClick: () => {
                  setStep((current) => current + 1);
                },
              }}
            />
          </div>
        </div>
        <Stepper
          steps={STEPS.slice(0, 3)}
          activeStep={1}
          className="border-primary/10 rounded-lg border"
        />
        <p className="text-tertiary text-xs">
          The second one has no onStepClick: nothing in it is a button.
        </p>
      </Section>

      <Section name="resend" title="Resend">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {RESEND_MODES.map((mode) => (
            <label key={mode} className="flex items-center gap-1.5">
              <input
                type="radio"
                name="resend-mode"
                checked={resendMode === mode}
                onChange={() => {
                  setResendMode(mode);
                }}
              />
              {mode === 'sync'
                ? 'returns at once'
                : mode === 'async'
                  ? 'takes 1.5 s'
                  : 'takes 1.5 s, then fails'}
            </label>
          ))}
        </div>
        <Resend label="Not received OTP?" count={8} onResend={onResend} />
        <p className="text-tertiary text-xs" data-testid="resend-count">
          onResend was called {resends} times
        </p>
      </Section>

      <Section name="auth" title="AuthBottomInstructions">
        <AuthBottomInstructions as={Link} terms={{ to: '/terms' }} privacy={{ to: '/privacy' }} />
        <AuthBottomInstructions
          terms={{ href: '#terms' }}
          privacy={{ href: '#privacy' }}
          message={({ terms, privacy }) => (
            <>
              Entering means you accept our {terms} and our {privacy}.
            </>
          )}
        />
      </Section>

      <Section name="scroll-to-top" title="ScrollToTop">
        <ScrollToTop
          pathname={pathname}
          id="scroll-demo-target"
          behavior={isSmooth ? 'smooth' : 'auto'}
          skipInitial
        />
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="w-52">
            <Button
              pattern="outline"
              content={`Change pathname (${pathname})`}
              buttonProps={{
                onClick: () => {
                  setPathname((current) => (current === '/page-1' ? '/page-2' : '/page-1'));
                },
              }}
            />
          </div>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={isSmooth}
              onChange={(event) => {
                setIsSmooth(event.target.checked);
              }}
            />
            smooth
          </label>
        </div>
        <p className="text-tertiary text-xs">
          Scroll down a little, then change the pathname: the page comes back to the top of this box
          (<code>id=&quot;scroll-demo-target&quot;</code>), and not when anything else changes.
        </p>
        <div id="scroll-demo-target" className="bg-primary/5 rounded-lg p-4 text-sm">
          The element that scrolls into view.
        </div>
        <div className="h-[120vh]" aria-hidden="true" />
      </Section>
    </>
  );
};
