// The components that were added after the first ones (fields, layout parts, dialogs, media, pickers,
// pages), as an app uses them: from the import paths of the package.
import {
  ApiStatus,
  BorderGradient,
  Button,
  Checkbox,
  ConfirmModal,
  Dropdown,
  type INetworkToaster,
  Input,
  LoadingRings,
  LoadingText,
  ModalWrapper,
  NetworkStatusToaster,
  Radio,
  ScrollableGradientContainer,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableHead,
  TableHeadCell,
  TableRow,
  TableRowCell,
  Textarea,
  type TNetworkStatus,
} from '@beautinique/frontend-components';
import { SocialAuth } from '@beautinique/frontend-components/auth';
import { Breadcrumb, getBreadcrumbItems } from '@beautinique/frontend-components/breadcrumb';
import { ColorInput } from '@beautinique/frontend-components/color-input';
import { FileInput } from '@beautinique/frontend-components/file-input';
import { HierarchySelect } from '@beautinique/frontend-components/hierarchy-select';
import { LoadingScreen, WakeUpProgress } from '@beautinique/frontend-components/loading-screen';
import {
  MediaCarouselWithModal,
  MediaCarouselWithParentMedia,
  type TMediaOption,
  VideoPlayer,
} from '@beautinique/frontend-components/media';
import {
  Checklist,
  EmailUsAction,
  HighlightNote,
  InfoCardGrid,
  LastUpdatedBadge,
  NumberedSteps,
  StaticPageCTA,
  StaticPageHeader,
  StaticPageLayout,
  StaticPageSection,
} from '@beautinique/frontend-components/static-page';
import { TestimonialCarousel } from '@beautinique/frontend-components/testimonials';
import { type ComponentProps, useState } from 'react';

const Section = ({ name, title, children }: ComponentProps<'section'> & { name: string }) => (
  <section className="flex flex-col gap-3" data-section={name}>
    <h2 className="text-secondary text-sm font-semibold">{title}</h2>
    {children}
  </section>
);

/** A picture made of a gradient, so the page needs no image files. */
const picture = (from: string, to: string, label: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><text x="200" y="160" font-size="40" text-anchor="middle" fill="white" font-family="sans-serif">${label}</text></svg>`,
  )}`;

const MEDIA: TMediaOption[] = [
  { type: 'image', url: picture('#f472b6', '#7c3aed', 'One') },
  { type: 'image', url: picture('#34d399', '#0ea5e9', 'Two') },
  {
    type: 'video',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  },
  { type: 'image', url: picture('#fbbf24', '#ef4444', 'Four') },
  { type: 'image', url: picture('#60a5fa', '#1e3a8a', 'Five') },
  { type: 'image', url: picture('#a3e635', '#15803d', 'Six') },
];

const TESTIMONIALS = [
  {
    name: 'Asha Rao',
    role: 'Founder',
    content: 'The range is lovely and my skin has never felt better.',
  },
  { name: 'Ben Okafor', content: 'Finding my shade was easy, and delivery was fast.', rating: 4 },
  {
    name: 'Chen Wei',
    role: 'Customer',
    content: 'Light, long lasting, and I get compliments all day.',
  },
];

const CATEGORIES = [
  {
    label: 'Skin care',
    value: 'skin',
    children: [
      { label: 'Cleanser', value: 'cleanser' },
      {
        label: 'Moisturiser',
        value: 'moisturiser',
        children: [
          { label: 'Day cream', value: 'day-cream' },
          { label: 'Night cream', value: 'night-cream' },
        ],
      },
      { label: 'Sunscreen (sold out)', value: 'sunscreen', disabled: true },
    ],
  },
  { label: 'Hair care', value: 'hair', children: [{ label: 'Shampoo', value: 'shampoo' }] },
  { label: 'Gift card', value: 'gift' },
];

const FRUIT = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana (sold out)', value: 'banana', disabled: true },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Date', value: 'date' },
];

const ROWS = [
  { name: 'Lipstick', stock: 12, price: '₹499' },
  { name: 'Serum', stock: 0, price: '₹1,299' },
  { name: 'Sunscreen', stock: 31, price: '₹699' },
];

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export const Library = ({ toaster }: { toaster: INetworkToaster }) => {
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [plan, setPlan] = useState('monthly');
  const [fruit, setFruit] = useState<string | number>('');
  const [category, setCategory] = useState<string | number>('');
  const [colour, setColour] = useState<string | undefined>('#ff3b7f');
  const [files, setFiles] = useState<(File | string)[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isScreenOpen, setIsScreenOpen] = useState(false);
  const [network, setNetwork] = useState<TNetworkStatus>('online');
  const [pathname, setPathname] = useState('/products/skin-care/night-cream');
  const [saving, setSaving] = useState(false);
  const [streamError, setStreamError] = useState('');
  const [isHlsJs, setIsHlsJs] = useState(false);

  const fileErrors = files.map((file) =>
    file instanceof File && file.size > 1024 * 1024 ? 'Larger than 1 MB' : undefined,
  );

  return (
    <>
      <Section name="inputs" title="Input, Textarea, Checkbox, Radio, Select">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            inputProps={{
              name: 'name',
              value: name,
              placeholder: 'Your name',
              onChange: (event) => {
                setName(event.target.value);
              },
            }}
            error={name.length > 0 && name.length < 3 ? 'At least 3 letters' : ''}
            icons={{
              right: name
                ? {
                    icon: 'solar:close-circle-linear',
                    label: 'Clear name',
                    onClick: () => {
                      setName('');
                    },
                  }
                : undefined,
            }}
          />
          <Textarea
            label="About you"
            textAreaProps={{ name: 'about', rows: 2, placeholder: 'A few words' }}
          />
          <Checkbox
            content="I agree to the terms"
            checkboxProps={{
              name: 'terms',
              checked: agreed,
              onChange: (event) => {
                setAgreed(event.target.checked);
              },
            }}
            tooltip={{ title: 'Required', description: 'Without it we cannot go on' }}
          />
          <Radio
            label="Plan"
            name="plan"
            value={plan}
            onChange={setPlan}
            options={[
              { label: 'Monthly', value: 'monthly' },
              { label: 'Yearly', value: 'yearly' },
            ]}
          />
          <Select
            label="Fruit"
            options={FRUIT}
            selectProps={{ value: fruit, onChange: setFruit, placeholder: 'Pick a fruit' }}
          />
          <Select
            label="Disabled"
            options={FRUIT}
            error="Cannot be changed"
            selectProps={{ value: 'apple', onChange: setFruit, disabled: true }}
          />
        </div>
      </Section>

      <Section name="hierarchy-select" title="HierarchySelect">
        <div className="max-w-sm">
          <HierarchySelect
            label="Category"
            options={CATEGORIES}
            selectProps={{
              value: category,
              onChange: setCategory,
              placeholder: 'Choose a category',
            }}
          />
        </div>
        <p className="text-tertiary text-xs">
          Chosen: {String(category) || 'nothing'}. Arrow keys move, Right and Left open and close a
          branch, Enter chooses, Escape closes; typing searches.
        </p>
      </Section>

      <Section name="color-input" title="ColorInput">
        <div className="max-w-xs">
          <ColorInput
            label="Brand colour"
            placeholder="Pick a colour"
            value={colour}
            onChange={setColour}
          />
        </div>
        <p className="text-tertiary text-xs">Value: {colour ?? 'none'}</p>
      </Section>

      <Section name="file-input" title="FileInput">
        <div className="max-w-lg">
          <FileInput
            label="Photos"
            fileInputProps={{
              name: 'photos',
              multiple: true,
              value: files,
              onChange: (event) => {
                const chosen = [...(event.target.files ?? [])];

                setFiles((current) => [...current, ...chosen]);
              },
            }}
            errors={fileErrors}
            handleRemove={(index) => {
              setFiles((current) => current.filter((_, position) => position !== index));
            }}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="w-52">
            <Button
              pattern="outline"
              content="Add saved pictures"
              buttonProps={{
                onClick: () => {
                  setFiles((current) => [...current, ...MEDIA.slice(0, 2).map((item) => item.url)]);
                },
              }}
            />
          </div>
        </div>
      </Section>

      <Section name="layout-parts" title="Skeleton, Table, BorderGradient, ApiStatus, loading">
        <div className="grid gap-4 md:grid-cols-2">
          <BorderGradient className="flex flex-col gap-2">
            <p className="text-secondary text-sm font-semibold">A card with a gradient border</p>
            <div className="flex items-center gap-3" aria-busy="true">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </BorderGradient>
          <Table aria-label="Stock">
            <TableHead>
              <TableRow>
                <TableHeadCell>Product</TableHeadCell>
                <TableHeadCell>Stock</TableHeadCell>
                <TableHeadCell>Price</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ROWS.map((row) => (
                <TableRow key={row.name} className="hover:bg-primary/5">
                  <TableRowCell>{row.name}</TableRowCell>
                  <TableRowCell>{row.stock}</TableRowCell>
                  <TableRowCell>{row.price}</TableRowCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <div className="border-primary/10 h-52 rounded-lg border">
            <ApiStatus status="loading" text="Loading" />
          </div>
          <div className="border-primary/10 h-52 rounded-lg border">
            <ApiStatus status="error" title="Could not load" description="Check your connection" />
          </div>
          <div className="border-primary/10 h-52 rounded-lg border">
            <ApiStatus status="empty" title="Nothing here" description="Add your first product" />
          </div>
          <div className="border-primary/10 h-52 rounded-lg border">
            <ApiStatus status="success" title="Saved" divider />
          </div>
        </div>
        <div className="border-primary/10 items-center justify-around rounded-lg border">
          <LoadingRings text="Rings" />
          <LoadingText text="Just the text" />
        </div>
        <ScrollableGradientContainer
          direction="horizontal"
          label="Scrolling row"
          className="border-primary/10 rounded-lg border"
        >
          <div className="flex gap-3 p-3">
            {Array.from({ length: 14 }, (_, index) => (
              <div
                key={index}
                className="bg-primary/10 grid h-16 w-28 shrink-0 place-items-center rounded-md text-sm"
              >
                {index + 1}
              </div>
            ))}
          </div>
        </ScrollableGradientContainer>
      </Section>

      <Section name="dropdown-dialogs" title="Dropdown, ModalWrapper, ConfirmModal, LoadingScreen">
        <div className="grid gap-4 md:grid-cols-2">
          <Dropdown
            title="Filters"
            showShadow
            isRounded
            closeOnEscape
            closeOnOutsideClick
            icons={{ left: { icon: 'solar:alt-arrow-right-linear' } }}
          >
            {({ close }) => (
              <div className="flex flex-col gap-2 text-sm">
                <p>Everything in here is out of reach while it is closed.</p>
                <button
                  type="button"
                  className="border-primary/20 w-fit rounded-md border px-3 py-1"
                  onClick={close}
                >
                  Close it
                </button>
              </div>
            )}
          </Dropdown>
          <div className="flex flex-wrap items-start gap-3">
            <div className="w-40">
              <Button
                pattern="outline"
                content="Open a dialog"
                buttonProps={{
                  onClick: () => {
                    setIsModalOpen(true);
                  },
                }}
              />
            </div>
            <div className="w-40">
              <Button
                pattern="outline"
                content="Ask to confirm"
                buttonProps={{
                  onClick: () => {
                    setIsConfirmOpen(true);
                  },
                }}
              />
            </div>
            <div className="w-40">
              <Button
                pattern="outline"
                content="Loading screen (4 s)"
                buttonProps={{
                  onClick: () => {
                    setIsScreenOpen(true);
                    void wait(4000).then(() => {
                      setIsScreenOpen(false);
                    });
                  },
                }}
              />
            </div>
          </div>
        </div>
        <ModalWrapper
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
          }}
          header={{ title: 'A dialog', showCloseIcon: true }}
        >
          <div className="flex flex-col gap-3 p-2 text-sm">
            <p>Tab stays in here, Escape closes it, and the page behind does not scroll.</p>
            <Input label="Try typing" inputProps={{ name: 'dialog-field' }} />
          </div>
        </ModalWrapper>
        <ConfirmModal
          type="warning"
          title="Delete this category?"
          description="It cannot be undone."
          buttons={{
            left: { content: 'Cancel' },
            right: {
              content: saving ? 'Deleting...' : 'Delete',
              buttonProps: {
                disabled: saving,
                onClick: () => {
                  setSaving(true);
                  void wait(1200).then(() => {
                    setSaving(false);
                    setIsConfirmOpen(false);
                  });
                },
              },
            },
          }}
          modalProps={{
            isOpen: isConfirmOpen,
            onClose: () => {
              setIsConfirmOpen(false);
            },
          }}
        />
        {isScreenOpen && (
          <LoadingScreen>
            <WakeUpProgress
              phase="services"
              services={['user', 'product', 'media']}
              awakeServices={['user']}
            />
          </LoadingScreen>
        )}
      </Section>

      <Section name="network" title="NetworkStatusToaster">
        <div className="flex flex-wrap items-center gap-2">
          {(['online', 'offline', 'connecting'] as const).map((status) => (
            <div key={status} className="w-36">
              <Button
                pattern={network === status ? 'primary' : 'outline'}
                content={status}
                buttonProps={{
                  onClick: () => {
                    setNetwork(status);
                  },
                }}
              />
            </div>
          ))}
          <NetworkStatusToaster status={network} toaster={toaster} />
        </div>
      </Section>

      <Section
        name="media"
        title="VideoPlayer, MediaCarouselWithModal, MediaCarouselWithParentMedia"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-tertiary text-xs">Thumbnails; one opens a dialog.</p>
            <MediaCarouselWithModal media={MEDIA} />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-tertiary text-xs">A video file, with controls.</p>
            <div className="h-48 overflow-hidden rounded-lg">
              <VideoPlayer
                videoProps={{
                  src: MEDIA.at(2)?.url,
                  controls: true,
                  autoPlay: false,
                  muted: false,
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-tertiary text-xs">
            A stream (.m3u8): hls.js is loaded for it only when it is played.{' '}
            {streamError && (
              <span className="text-red-c">It could not be played: {streamError}</span>
            )}
          </p>
          <div className="w-72">
            <Button
              pattern="outline"
              content={isHlsJs ? 'hls.js is playing it' : 'Pretend the browser cannot play HLS'}
              buttonProps={{
                disabled: isHlsJs,
                onClick: () => {
                  // a browser that cannot play HLS itself says so to canPlayType(): hls.js takes over
                  // the method is called on the video it was asked of: it is not used on its own
                  // eslint-disable-next-line @typescript-eslint/unbound-method
                  const original = HTMLMediaElement.prototype.canPlayType;

                  HTMLMediaElement.prototype.canPlayType = function canPlayType(type: string) {
                    return type === 'application/vnd.apple.mpegurl'
                      ? ''
                      : original.call(this, type);
                  };
                  setIsHlsJs(true);
                },
              }}
            />
          </div>
          <div className="h-48 max-w-md overflow-hidden rounded-lg">
            <VideoPlayer
              key={String(isHlsJs)}
              videoProps={{
                src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
                controls: true,
              }}
              onStreamError={(error) => {
                setStreamError(error instanceof Error ? error.message : 'a fatal error');
              }}
            />
          </div>
        </div>
        <div className="max-w-xl">
          <MediaCarouselWithParentMedia media={MEDIA} />
        </div>
      </Section>

      <Section name="testimonials" title="TestimonialCarousel">
        <div className="max-w-md">
          <TestimonialCarousel testimonials={TESTIMONIALS} interval={4000} />
        </div>
      </Section>

      <Section name="breadcrumb-social" title="Breadcrumb, SocialAuth">
        <Breadcrumb
          items={getBreadcrumbItems(pathname)}
          onNavigate={(href) => {
            setPathname(href);
          }}
        />
        <p className="text-tertiary text-xs">
          Path: {pathname} (a click goes there without loading the page).
        </p>
        <SocialAuth
          providers={[
            { name: 'Google', icon: 'logos:google-icon', href: '#google' },
            { name: 'GitHub', icon: 'logos:github-icon', href: '#github' },
            { name: 'LinkedIn', icon: 'logos:linkedin-icon', href: '#linkedin' },
          ]}
        />
      </Section>

      <Section name="static-page" title="Static page parts">
        <div className="border-primary/10 rounded-xl border">
          <StaticPageLayout>
            <StaticPageHeader
              icon="solar:shield-check-linear"
              title="Our promise"
              description="What we stand for, and how we keep to it."
              meta={<LastUpdatedBadge date="2026-10-15" />}
            />
            <StaticPageSection title="What you can expect">
              <Checklist items={['Tested on skin, not on animals', 'Ingredients listed in full']} />
              <InfoCardGrid
                columns={3}
                items={[
                  {
                    icon: 'solar:leaf-linear',
                    title: 'Clean',
                    description: 'No harsh ingredients',
                  },
                  { icon: 'solar:box-linear', title: 'Fast', description: 'Delivered in two days' },
                  { icon: 'solar:heart-linear', title: 'Kind', description: 'Cruelty free' },
                ]}
              />
              <HighlightNote title="A note">Results differ from one skin to another.</HighlightNote>
              <NumberedSteps
                steps={[
                  { title: 'Choose', description: 'Pick what you like' },
                  { title: 'Order', description: 'Pay safely' },
                  { title: 'Enjoy', description: 'It arrives in two days' },
                ]}
              />
            </StaticPageSection>
            <StaticPageCTA
              title="Get in touch"
              description="We reply within a day."
              actions={<EmailUsAction email="hello@example.com" />}
            />
          </StaticPageLayout>
        </div>
      </Section>
    </>
  );
};
