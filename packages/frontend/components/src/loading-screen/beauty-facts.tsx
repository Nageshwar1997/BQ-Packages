import type { ReactNode } from 'react';

// The words of a fact that stand out: the `gradient-text-accent` utility of `@beautinique/frontend-styles`.
const Accent = ({ children }: { children: ReactNode }) => (
  <span className="gradient-text-accent">{children}</span>
);

/** The facts the loading screen shows while it waits, one at a time. */
export const BEAUTY_FACTS: readonly ReactNode[] = [
  <>
    {'The term '}
    <Accent>{'"Clean Beauty"'}</Accent>
    {' refers to skincare and makeup products made without harmful chemicals and toxins.'}
  </>,
  <>
    {'In '}
    <Accent>{'"1915"'}</Accent>
    {', Maurice Levy invented the first '}
    <Accent>{'"twist-up lipstick"'}</Accent>
    {', revolutionizing the beauty industry.'}
  </>,
  <>
    {'The first-ever commercial mascara, '}
    <Accent>{'"Maybelline Cake Mascara"'}</Accent>
    {', was introduced in '}
    <Accent>{'"1917"'}</Accent>
    {'.'}
  </>,
  <>
    <Accent>{'BB Cream (2011)'}</Accent>
    {' became a global sensation by combining skincare and foundation into one product.'}
  </>,
  <>
    {'The first '}
    <Accent>{'cruelty-free certification'}</Accent>
    {' was introduced in '}
    <Accent>{'"1996"'}</Accent>
    {' to support ethical beauty practices.'}
  </>,
  <>
    <Accent>{'Vegan beauty'}</Accent>
    {' is on the rise, with brands formulating products without any animal-derived ingredients.'}
  </>,
  <>
    {'Dermatologists recommend '}
    <Accent>{'SPF 30+'}</Accent>
    {' for daily sun protection to prevent premature aging and skin damage.'}
  </>,
  <>
    <Accent>{'Serums'}</Accent>
    {
      ' contain concentrated active ingredients that penetrate deeper into the skin for enhanced benefits.'
    }
  </>,
  <>
    <Accent>{'Micellar Water'}</Accent>
    {
      ' is a gentle yet effective way to cleanse the skin without rinsing, perfect for all skin types.'
    }
  </>,
  <>
    {"The world's first "}
    <Accent>{'organic beauty brand'}</Accent>
    {' was founded in '}
    <Accent>{'1978'}</Accent>
    {', paving the way for natural cosmetics.'}
  </>,
  <>
    {'Some beauty brands use '}
    <Accent>{'AI-powered tools'}</Accent>
    {' to personalize skincare recommendations based on user preferences.'}
  </>,
  <>
    <Accent>{'Hyaluronic Acid'}</Accent>
    {' is a powerful hydrating ingredient that can hold up to 1,000 times its weight in water.'}
  </>,
  <>
    <Accent>{'Retinol'}</Accent>
    {
      ' is a dermatologist-approved ingredient known for reducing fine lines and improving skin texture.'
    }
  </>,
  <>
    <Accent>{'Green Beauty'}</Accent>
    {
      ' focuses on sustainable packaging and eco-friendly formulations to reduce environmental impact.'
    }
  </>,
  <>
    <Accent>{'Sheet masks'}</Accent>
    {' originated in Indian and have become a staple in self-care and skincare routines worldwide.'}
  </>,
  <>
    {'The global '}
    <Accent>{'cosmetic industry'}</Accent>
    {' is expected to reach '}
    <Accent>{'$500 billion'}</Accent>
    {' by '}
    <Accent>{'2026'}</Accent>
    {'.'}
  </>,
  <>
    {'The first-ever '}
    <Accent>{'waterproof mascara'}</Accent>
    {' was developed in '}
    <Accent>{'1938'}</Accent>
    {' and changed the beauty game.'}
  </>,
  <>
    {'The first '}
    <Accent>{'liquid foundation'}</Accent>
    {' was launched in the '}
    <Accent>{'1950s'}</Accent>
    {', offering a more natural finish.'}
  </>,
  <>
    {'The term "glass skin" was popularized by '}
    <Accent>{'Indian beauty'}</Accent>
    {' trends, emphasizing dewy, radiant skin.'}
  </>,
  <>
    {'The first commercial '}
    <Accent>{'lip gloss'}</Accent>
    {' was introduced by Max Factor in '}
    <Accent>{'1930'}</Accent>
    {'.'}
  </>,
  <>
    {'In the early '}
    <Accent>{'2000s'}</Accent>
    {', mineral makeup became a sought-after trend for its natural ingredients and skin benefits.'}
  </>,
  <>
    {'The '}
    <Accent>{'Beauty Blender,'}</Accent>
    {' launched in '}
    <Accent>{'2007'}</Accent>
    {', transformed the way people applied foundation.'}
  </>,
  <>
    <Accent>{'Facial oils'}</Accent>
    {
      ' have gained popularity for their nourishing and hydrating properties, even for oily skin types.'
    }
  </>,
  <>
    {'Some brands are experimenting with '}
    <Accent>{'AI makeup try-ons'}</Accent>
    {' to help users choose the perfect shade before purchasing.'}
  </>,
  <>
    {'The concept of a '}
    <Accent>{'beauty subscription box'}</Accent>
    {' allows customers to try new products every month.'}
  </>,
  <>
    {'Some experts believe that '}
    <Accent>{'customized skincare'}</Accent>
    {' could be the future of the beauty industry.'}
  </>,
  <>
    {'Others caution about potential risks of certain '}
    <Accent>{'skincare ingredients,'}</Accent>
    {' such as parabens and sulfates.'}
  </>,
  <>
    {'The development of '}
    <Accent>{'sustainable beauty'}</Accent>
    {' aims to reduce plastic waste and promote ethical sourcing.'}
  </>,
  <>
    {'Despite trends, timeless beauty practices like '}
    <Accent>{'hydration'}</Accent>
    {' and '}
    <Accent>{'healthy eating'}</Accent>
    {' remain essential for glowing skin.'}
  </>,
  <>
    {'The first known use of the term '}
    <Accent>{'"cosmeceuticals"'}</Accent>
    {' was in '}
    <Accent>{'1984'}</Accent>
    {' to describe skincare products with medical benefits.'}
  </>,
  <>
    <Accent>{'Fermented skincare'}</Accent>
    {' is gaining popularity for its probiotic benefits that improve skin health.'}
  </>,
  <>
    <Accent>{'Beauty influencers'}</Accent>
    {' have a huge impact on the cosmetic industry, shaping trends and product demands.'}
  </>,
  <>
    <Accent>{'AR beauty'}</Accent>
    {' apps are helping customers try on makeup virtually before making a purchase.'}
  </>,
  <>
    {'The concept of '}
    <Accent>{'smart skincare devices'}</Accent>
    {' is transforming beauty routines with AI-powered technology.'}
  </>,
  <>
    {'Some companies are developing '}
    <Accent>{'biodegradable glitter'}</Accent>
    {' to make beauty more sustainable.'}
  </>,
  <>
    {'The future of '}
    <Accent>{'clean beauty'}</Accent>
    {' is focused on transparency, sustainability, and effective formulations.'}
  </>,
  <>
    {'The first '}
    <Accent>{'fragrance-free makeup line'}</Accent>
    {' was launched in '}
    <Accent>{'1980'}</Accent>
    {' to cater to sensitive skin.'}
  </>,
  <>
    {'The term '}
    <Accent>{'dermocosmetics'}</Accent>
    {' is used for products that bridge the gap between skincare and dermatology.'}
  </>,
  <>
    {'The rise of '}
    <Accent>{'gender-neutral beauty'}</Accent>
    {' is redefining the industry with inclusive products for all.'}
  </>,
  <>
    <Accent>{'Biodegradable packaging'}</Accent>
    {' is becoming more common in the beauty industry to reduce waste.'}
  </>,
  <>
    <Accent>{'Refillable makeup'}</Accent>
    {' is a growing trend that allows users to reuse packaging and minimize waste.'}
  </>,
  <>
    {'The first commercial '}
    <Accent>{'nail polish'}</Accent>
    {' was inspired by automobile paint and introduced in '}
    <Accent>{'1932'}</Accent>
    {'.'}
  </>,
  <>
    {'The term '}
    <Accent>{'"blue beauty"'}</Accent>
    {' refers to eco-conscious products designed to protect ocean ecosystems.'}
  </>,
  <>
    <Accent>{'Glass packaging'}</Accent>
    {' is being used more in luxury beauty to reduce plastic waste and enhance sustainability.'}
  </>,
];
