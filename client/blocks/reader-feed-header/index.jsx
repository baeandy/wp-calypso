/** @format */
/**
 * External Dependencies
 */
import classnames from 'classnames';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { localize } from 'i18n-calypso';
import { connect } from 'react-redux';

/**
 * Internal Dependencies
 */
import Card from 'components/card';
import ReaderFollowButton from 'reader/follow-button';
import { isAuthorNameBlacklisted } from 'reader/lib/author-name-blacklist';
import HeaderBack from 'reader/header-back';
import { getSiteDescription, getSiteName, getSiteUrl } from 'reader/get-helpers';
import SiteIcon from 'blocks/site-icon';
import BlogStickers from 'blocks/blog-stickers';
import ReaderFeedHeaderSiteBadge from './badge';
import ReaderEmailSettings from 'blocks/reader-email-settings';
import ReaderSiteNotificationSettings from 'blocks/reader-site-notification-settings';
import config from 'config';
import userSettings from 'lib/user-settings';
import { isFollowing } from 'state/selectors';

class FeedHeader extends Component {
	static propTypes = {
		site: PropTypes.object,
		feed: PropTypes.object,
		showBack: PropTypes.bool,
	};

	getFollowerCount = ( feed, site ) => {
		if ( site && site.subscribers_count ) {
			return site.subscribers_count;
		}

		if ( feed && feed.subscribers_count > 0 ) {
			return feed.subscribers_count;
		}

		return null;
	};

	render() {
		const { site, feed, showBack, translate, following } = this.props;
		const followerCount = this.getFollowerCount( feed, site );
		const ownerDisplayName = site && ! site.is_multi_author && site.owner && site.owner.name;
		const description = getSiteDescription( { site, feed } );
		const siteTitle = getSiteName( { feed, site } );
		const siteUrl = getSiteUrl( { feed, site } );
		const isEmailBlocked = userSettings.getSetting( 'subscription_delivery_email_blocked' );
		const siteId = site && site.ID;

		const classes = classnames( 'reader-feed-header', {
			'is-placeholder': ! site && ! feed,
			'has-back-button': showBack,
		} );

		const notificationSettings = config.isEnabled( 'reader/new-post-notifications' ) ? (
			<ReaderSiteNotificationSettings siteId={ siteId } />
		) : (
			<ReaderEmailSettings siteId={ siteId } />
		);

		return (
			<div className={ classes }>
				<div className="reader-feed-header__back-and-follow">
					{ showBack && <HeaderBack /> }
					<div className="reader-feed-header__follow">
						{ followerCount && (
							<span className="reader-feed-header__follow-count">
								{' '}
								{ translate( '%s follower', '%s followers', {
									count: followerCount,
									args: [ this.props.numberFormat( followerCount ) ],
								} ) }
							</span>
						) }
						<div className="reader-feed-header__follow-and-settings">
							{ feed &&
								! feed.is_error && (
									<div className="reader-feed-header__follow-button">
										<ReaderFollowButton siteUrl={ feed.feed_URL } iconSize={ 24 } />
									</div>
								) }
							{ site &&
								following &&
								! isEmailBlocked && (
									<div className="reader-feed-header__email-settings">{ notificationSettings }</div>
								) }
						</div>
					</div>
				</div>
				<Card className="reader-feed-header__site">
					<a href={ siteUrl } className="reader-feed-header__site-icon">
						<SiteIcon site={ site } size={ 96 } />
					</a>
					<div className="reader-feed-header__site-title">
						{ site && (
							<span className="reader-feed-header__site-badge">
								<ReaderFeedHeaderSiteBadge site={ site } />
								<BlogStickers blogId={ site.ID } />
							</span>
						) }
						<a className="reader-feed-header__site-title-link" href={ siteUrl }>
							{ siteTitle }
						</a>
					</div>
					<div className="reader-feed-header__details">
						<span className="reader-feed-header__description">{ description }</span>
						{ ownerDisplayName &&
							! isAuthorNameBlacklisted( ownerDisplayName ) && (
								<span className="reader-feed-header__byline">
									{ translate( 'by %(author)s', {
										args: {
											author: ownerDisplayName,
										},
									} ) }
								</span>
							) }
					</div>
				</Card>
			</div>
		);
	}
}

export default connect( ( state, ownProps ) => ( {
	following: ownProps.feed && isFollowing( state, { feedUrl: ownProps.feed.feed_URL } ),
} ) )( localize( FeedHeader ) );
