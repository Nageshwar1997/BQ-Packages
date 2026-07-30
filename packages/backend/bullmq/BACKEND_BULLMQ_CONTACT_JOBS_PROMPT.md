# Add Contact-Us mail jobs to `@beautinique/backend-bullmq`

## Context

`organization-service` just shipped a "Contact Us" feature (`POST /api/v1/contact`).
On successful ticket creation it needs to enqueue two emails via BullMQ:

1. **Acknowledgement** to the user who submitted the query.
2. **Admin notification** to the support inbox, with the full submission so an
   admin can reply directly from their own mail client.

Both are sent through `mail-service`'s existing `MailTransporter`, which already
has a private generic sender:

```ts
// mail-service/src/classes/Transporter.ts
private async sendMail(options: { to: string; subject: string; htmlOrText: string }) {
  const text = convert(options.htmlOrText, { wordwrap: 130 });
  await this.client.transactionalEmails.sendTransacEmail({
    sender: { name: 'Beautinique', email: envs.mail.from },
    to: [{ email: options.to }],
    subject: options.subject,
    htmlContent: options.htmlOrText,
    textContent: text,
  });
}
```

`sendMail` just isn't wired to a BullMQ job yet, and `QUEUE_SCHEMA` in this
package doesn't declare any job for it. Right now `organization-service`
bypasses the schema entirely with a type-unsafe cast as a placeholder:

```ts
// organization-service/src/utils/index.ts
export const enqueueContactMail = (data: IContactMailJob) =>
  (
    jobProducer.addJob as unknown as (
      queueName: string,
      jobName: string,
      data: IContactMailJob,
    ) => Promise<unknown>
  )('contact-queue', 'send-contact-mail', data);
```

where `IContactMailJob = { to: string; subject: string; htmlOrText: string }`.
That cast needs to go away once this package supports it properly.

## Current `QUEUE_SCHEMA` (for reference)

```ts
interface TEmailOtp {
  email: string;
  otp: string;
}

declare const QUEUE_SCHEMA: {
  readonly 'mail-queue': {
    readonly 'send-otp': TEmailOtp;
  };
  readonly 'media-queue': {
    readonly 'remove-single-media-directly': TSingleMedia;
    readonly 'remove-multiple-media-directly': TMultipleMedia;
    readonly 'create-single-unused-media': TCreateMedia;
    readonly 'create-multiple-unused-media': TCreateMedia[];
    readonly 'mark-single-media-as-used': TSingleMedia;
    readonly 'mark-multiple-media-as-used': Pick<TMultipleMedia, 'publicIds'>;
    readonly 'delete-single-media': TSingleMedia;
    readonly 'delete-multiple-media': Pick<TMultipleMedia, 'publicIds'>;
  };
};
```

`JobProducer.addJob<Q, J>` and `JobWorker`'s `TJobHandlers<Q>` are both derived
from this schema at compile time, so adding jobs here is what makes them
type-safe on both the producer (`organization-service`) and consumer
(`mail-service`) sides.

## Task

Add **two new job names under the existing `mail-queue`** (don't introduce a
new `contact-queue` — `mail-queue` is already the general-purpose email queue
and `mail-service`'s `WorkerManager` only listens on that one queue; a new
queue would need a whole new worker for no real benefit):

```ts
interface TContactAcknowledgementMail {
  to: string;
  subject: string;
  htmlOrText: string;
}

interface TContactAdminNotificationMail {
  to: string;
  subject: string;
  htmlOrText: string;
}

declare const QUEUE_SCHEMA: {
  readonly 'mail-queue': {
    readonly 'send-otp': TEmailOtp;
    readonly 'send-contact-acknowledgement': TContactAcknowledgementMail;
    readonly 'send-contact-admin-notification': TContactAdminNotificationMail;
  };
  readonly 'media-queue': { /* unchanged */ };
};
```

Export both new interfaces from the package's public entry (same as
`TEmailOtp`, `TSingleMedia`, etc. are already exported today).

**Payload shape note**: both jobs intentionally carry a pre-rendered
`{ to, subject, htmlOrText }` rather than semantic fields like `send-otp`
does (`{ email, otp }`, rendered into HTML inside the worker). That's because
`organization-service` already builds the HTML itself
(`buildContactAcknowledgementEmail` / `buildContactAdminNotificationEmail` in
`organization-service/src/utils/index.ts`) and is already tested end-to-end
against this exact shape — keep it as-is unless you'd rather move templating
into `mail-service` and refactor the producer side too (bigger change, not
required).

## Also needs (outside this package, flag but don't skip)

1. **`mail-service`**: `WorkerManager`'s `handlers` map
   (`mail-service/src/classes/WorkerManager.ts`) must gain two new entries -
   `TJobHandlers<'mail-queue'>` will be a compile error there until you add
   `'send-contact-acknowledgement'` and `'send-contact-admin-notification'`
   handlers. Each can just call the transporter's generic sender - you'll
   need to make `MailTransporter.sendMail` non-private (or add a thin public
   wrapper) since it's currently `private`.
2. **`organization-service`**: once this package is published at a new
   version, bump `@beautinique/backend-bullmq` in
   `organization-service/package.json` and replace the cast in
   `enqueueContactMail` (`src/utils/index.ts`) with real, type-checked
   `jobProducer.addJob('mail-queue', 'send-contact-acknowledgement', data)`
   / `'send-contact-admin-notification'` calls.

## Deliverable

- `QUEUE_SCHEMA` updated with the two new `mail-queue` job entries above.
- New payload interfaces exported from the package's public API.
- Version bump + changelog entry per this repo's normal release process.
- Don't touch `organization-service` or `mail-service` source in this repo -
  just flag the two follow-up changes above in your summary so they can be
  done in `BQ-Microservices` afterward.
