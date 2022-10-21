import { defineComponent, ref, useContext } from '@nuxtjs/composition-api';
import { ModelOfferItem } from '~/interfaces/api';

/**
 * 
 * The Jump-Link component is intended for switching to third-party resources (usually in stores).
 * Provides protection against double-clicking, following the application link, scrolling buttons and sending analytics.
 * @param {to} link to go to
 * @param {offer} information about the store (product)
 * @param {position} parameter slot to add in posylanne
 * @param {blockType} parameter block to add to the link
 */

export default defineComponent({
  name: 'jump-link',
  props: {
    to: {
      type: String,
      required: true,
    },
    offer: {
      type: Object as () => ModelOfferItem | undefined,
      required: true,
    },
    position: {
      type: Number,
      default: 1,
    },
    blockType: {
      type: String,
      default: 'unknown',
    },
  },
  setup(props) {
    const jumpLink = ref();
    const {
      $gtmEvent,
      $gtmOfferEvent,
      $gtagEvent,
      $ymGoalEvent,
      $ymCpcEvent,
      $rtbEvent,
      store,
      app: { router },
    } = useContext();
  
    // double click protection
    let preventClick = false;
    const preventClickTimeout = 3000; // in milliseconds

    const isRelativeLink: boolean =
      !!props.to && props.to.match(/^(?:[a-z]+:)?\/\//i) === null;

    // setting up referral links
    function onMouseDown() {
      if (
        jumpLink.value &&
        props.to &&
        (!store.state.useCPO || !props.offer?.cpo)
      ) {
        if (isRelativeLink) {
          const origin = process.env.CPC_PREFIX || window.location.origin;
          const { to, position } = props;
          const session = store.state.analytics.session.id;
          const pageView = store.state.analytics.pageviewId;
          const type = props.blockType;
          const wd = navigator?.webdriver ? 1 : 0;
          jumpLink.value.href = `${origin}${to}&slot=${position}&session_id=${session}&pageview_id=${pageView}&block=${type}&wd=${wd}`;
        } else {
          jumpLink.value.href = props.to;
        }
      }
    }

    // sending analytics
    const sendAnalytics = (offer: ModelOfferItem) => {
      const { cost, model_id, price, shop_info } = offer;
      $gtmEvent(cost, shop_info?.id || 0, price);
      if (store.state.rtb) {
        $rtbEvent(cost || '0.0', model_id);
      } else {
        $rtbEvent('0.0', model_id);
      }
      $gtmOfferEvent(model_id, price);
      $ymCpcEvent();
      $ymGoalEvent(cost);
      $gtagEvent(cost);
    };

    // following a link
    const toLink = async (event?: MouseEvent, isAuxClick?: boolean) => {
      const { offer } = props;
      if (offer) {
        if (store.state.useCPO && offer.cpo) {
          event?.preventDefault();
          if (isAuxClick) {
            window.open(
              `${window.location.origin}/checkout/?offer_id=${offer.id}`
            );
          } else {
            router?.push({
              path: '/checkout',
              query: {
                offer_id: String(offer.id),
              },
            });
          }
        } else {
          if (preventClick && !isAuxClick) {
            event?.preventDefault();
            return false;
          }
          preventClick = true;
          await store.dispatch('analytics/addOfferClick', offer.id);
          if (isRelativeLink && jumpLink.value && jumpLink.value.href) {
            if (!jumpLink.value.href.includes('&ct=')) {
              jumpLink.value.href += `&ct=${Date.now()}`;
            }
            const clicks = store.state.analytics.offersClick[offer.id];
            if (jumpLink.value.href.includes('&clk=')) {
              jumpLink.value.href = jumpLink.value.href.replace(
                /&clk=(\d+)/,
                `&clk=${clicks}`
              );
            } else {
              jumpLink.value.href += '&clk=' + clicks;
            }
          }
          sendAnalytics(offer);
          setTimeout(() => {
            preventClick = false;
          }, preventClickTimeout);
        }
      }
    };

    // following links when scroll button is clicked
    function onAuxClick(event: MouseEvent) {
      if (event.button === 1) {
        toLink(event, true);
      }
    }

    return {
      jumpLink,
      onMouseDown,
      toLink,
      onAuxClick,
    };
  },
});
