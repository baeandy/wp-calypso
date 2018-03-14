/** @format */

/**
 * External dependencies
 */
import React, { Component, Fragment } from 'react';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { moment, localize } from 'i18n-calypso';
import { sortBy, find } from 'lodash';

/**
 * Internal dependencies
 */
import { dashboardListLimit } from 'woocommerce/app/store-stats/constants';
import DashboardWidget from 'woocommerce/components/dashboard-widget';
import { getLink } from 'woocommerce/lib/nav-utils';
import { getPreference } from 'state/preferences/selectors';
import { getSelectedSiteWithFallback } from 'woocommerce/state/sites/selectors';
import { getSiteStatsNormalizedData } from 'state/stats/lists/selectors';
import { getQueries } from './queries';
import {
	getUnitPeriod,
	getStartPeriod,
	getDelta,
	getDeltaFromData,
	getEndPeriod,
	getProductConversionRateData,
} from 'woocommerce/app/store-stats/utils';
import List from './list';
import QueryPreferences from 'components/data/query-preferences';
import QuerySiteStats from 'components/data/query-site-stats';
import { savePreference } from 'state/preferences/actions';
import SelectDropdown from 'components/select-dropdown';
import Stat from './stat';

class StatsWidget extends Component {
	static propTypes = {
		site: PropTypes.shape( {
			name: PropTypes.string.isRequired,
			slug: PropTypes.string.isRequired,
		} ),
		unit: PropTypes.string,
		queries: PropTypes.object,
		orderData: PropTypes.object,
		referrerData: PropTypes.array,
		topEarnersData: PropTypes.array,
		visitorData: PropTypes.array,
		productData: PropTypes.array,
		saveDashboardUnit: PropTypes.func,
	};

	handleTimePeriodChange = option => {
		const { saveDashboardUnit } = this.props;
		saveDashboardUnit( option.value );
	};

	dateForDisplay = () => {
		const { translate, unit } = this.props;

		const localizedDate = moment( moment().format( 'YYYY-MM-DD' ) );
		let formattedDate;
		switch ( unit ) {
			case 'week':
				formattedDate = translate( '%(startDate)s - %(endDate)s', {
					context: 'Date range for which stats are being displayed',
					args: {
						// LL is a date localized by momentjs
						startDate: localizedDate
							.startOf( 'week' )
							.add( 1, 'd' )
							.format( 'LL' ),
						endDate: localizedDate
							.endOf( 'week' )
							.add( 1, 'd' )
							.format( 'LL' ),
					},
				} );
				break;

			case 'month':
				formattedDate = localizedDate.format( 'MMMM YYYY' );
				break;

			case 'year':
				formattedDate = localizedDate.format( 'YYYY' );
				break;

			default:
				// LL is a date localized by momentjs
				formattedDate = localizedDate.format( 'LL' );
		}

		return formattedDate;
	};

	renderTitle = () => {
		const { site, translate, unit } = this.props;

		const options = [
			{ value: 'day', label: 'day' },
			{ value: 'week', label: 'week' },
			{ value: 'month', label: 'month' },
		];

		const dateDisplay = this.dateForDisplay();

		return (
			<Fragment>
				<span>
					{ translate( '%(siteName)s in the last {{timePeriodSelector/}}', {
						args: { siteName: site.name },
						components: {
							timePeriodSelector: (
								<SelectDropdown
									options={ options }
									initialSelected={ unit }
									onSelect={ this.handleTimePeriodChange }
								/>
							),
						},
						context:
							'Store stats dashboard widget title. Example: "Your Site in the last day|week|month.".',
					} ) }
				</span>
				<p>{ dateDisplay }</p>
			</Fragment>
		);
	};

	renderOrders = () => {
		const { site, translate, unit, orderData } = this.props;
		const date = getEndPeriod( moment().format( 'YYYY-MM-DD' ), unit );
		const delta =
			( orderData &&
				orderData.deltas &&
				orderData.deltas.length &&
				getDelta( orderData.deltas, date, 'orders' ) ) ||
			{};
		return (
			<Stat
				site={ site }
				label={ translate( 'Orders' ) }
				stat="statsOrders"
				attribute="orders"
				data={ ( orderData && orderData.data ) || [] }
				delta={ delta }
				date={ date }
				type="number"
			/>
		);
	};

	renderSales = () => {
		const { site, translate, unit, orderData } = this.props;
		const date = getEndPeriod( moment().format( 'YYYY-MM-DD' ), unit );
		const delta =
			( orderData &&
				orderData.deltas &&
				orderData.deltas.length &&
				getDelta( orderData.deltas, date, 'total_sales' ) ) ||
			{};
		return (
			<Stat
				site={ site }
				label={ translate( 'Sales' ) }
				stat="statsOrders"
				attribute="total_sales"
				data={ ( orderData && orderData.data ) || [] }
				delta={ delta }
				date={ date }
				type="currency"
			/>
		);
	};

	renderVisitors = () => {
		const { site, translate, unit, visitorData } = this.props;
		const date = getStartPeriod( moment().format( 'YYYY-MM-DD' ), unit );
		const delta = getDeltaFromData( visitorData, date, 'visitors', unit );
		return (
			<Stat
				site={ site }
				label={ translate( 'Visitors' ) }
				data={ visitorData || [] }
				delta={ delta }
				date={ date }
				stat="statsVisits"
				attribute="visitors"
				type="number"
			/>
		);
	};

	renderConversionRate = () => {
		const { site, translate, unit, visitorData, productData } = this.props;
		const date = getUnitPeriod( moment().format( 'YYYY-MM-DD' ), unit );
		const data = getProductConversionRateData( visitorData, productData, unit );
		const delta = getDeltaFromData( data, date, 'productPurchases', unit );
		return (
			<Stat
				site={ site }
				label={ translate( 'Conversion rate' ) }
				data={ data || [] }
				delta={ delta }
				date={ date }
				stat="statsVisits"
				attribute="productPurchases"
				type="percent"
			/>
		);
	};

	renderReferrers = () => {
		const { site, translate, unit, referrerData, queries } = this.props;
		const { referrerQuery } = queries;

		const row = find( referrerData, d => d.date === referrerQuery.date );
		const fetchedData =
			( row && sortBy( row.data, r => -r.sales ).slice( 0, dashboardListLimit ) ) || [];

		const values = [
			{ key: 'referrer', title: translate( 'Referrer' ), format: 'text' },
			{ key: 'product_views', title: translate( 'Referrals' ), format: 'text' },
			{ key: 'sales', title: translate( 'Sales' ), format: 'currency' },
		];

		return (
			<List
				site={ site }
				statSlug="referrers"
				statType="statsStoreReferrers"
				unit={ unit }
				values={ values }
				query={ referrerQuery }
				fetchedData={ fetchedData }
				emptyMessage={ translate( 'No referral activity has been recorded for this time period.' ) }
			/>
		);
	};

	renderProducts = () => {
		const { site, translate, unit, topEarnersData, queries } = this.props;
		const { topEarnersQuery } = queries;
		const values = [
			{ key: 'name', title: translate( 'Product' ), format: 'text' },
			{ key: 'total', title: translate( 'Sales' ), format: 'currency' },
		];

		return (
			<List
				site={ site }
				statSlug="products"
				statType="statsTopEarners"
				unit={ unit }
				values={ values }
				query={ topEarnersQuery }
				fetchedData={ topEarnersData }
				emptyMessage={ translate( 'No products have been sold in this time period.' ) }
			/>
		);
	};

	queryData = () => {
		const { site, queries } = this.props;
		return (
			<Fragment>
				<QueryPreferences />
				<QuerySiteStats statType="statsOrders" siteId={ site.ID } query={ queries.orderQuery } />
				<QuerySiteStats
					statType="statsTopEarners"
					siteId={ site.ID }
					query={ queries.topEarnersQuery }
				/>
				<QuerySiteStats
					statType="statsStoreReferrers"
					siteId={ site.ID }
					query={ queries.referrerQuery }
				/>
				<QuerySiteStats
					statType="statsStoreProductEvents"
					siteId={ site.ID }
					query={ queries.productQuery }
				/>
				<QuerySiteStats statType="statsVisits" siteId={ site.ID } query={ queries.visitorQuery } />
			</Fragment>
		);
	};

	render() {
		const { site, translate } = this.props;
		return (
			<div className="stats-widget">
				{ this.queryData() }
				<DashboardWidget title={ this.renderTitle() }>
					<div className="stats-widget__boxes">
						{ this.renderOrders() }
						{ this.renderSales() }
						{ this.renderVisitors() }
						{ this.renderConversionRate() }
						{ this.renderReferrers() }
						{ this.renderProducts() }
					</div>

					<div className="stats-widget__footer">
						<span>
							{ translate(
								"You can view more detailed stats and reports on your site's main dashboard."
							) }
						</span>
						<a href={ getLink( '/store/stats/orders/day/:site', site ) }>
							{ translate( 'View full stats' ) }
						</a>
					</div>
				</DashboardWidget>
			</div>
		);
	}
}

function mapStateToProps( state ) {
	const site = getSelectedSiteWithFallback( state );
	const unit = getPreference( state, 'store-dashboardStatsWidgetUnit' );

	const queries = getQueries( unit );

	const orderData = getSiteStatsNormalizedData( state, site.ID, 'statsOrders', queries.orderQuery );
	const visitorData = getSiteStatsNormalizedData(
		state,
		site.ID,
		'statsVisits',
		queries.visitorQuery
	);
	const productData = getSiteStatsNormalizedData(
		state,
		site.ID,
		'statsStoreProductEvents',
		queries.productQuery
	);
	const topEarnersData = getSiteStatsNormalizedData(
		state,
		site.ID,
		'statsTopEarners',
		queries.topEarnersQuery
	);
	const referrerData = getSiteStatsNormalizedData(
		state,
		site.ID,
		'statsStoreReferrers',
		queries.referrerQuery
	);

	return {
		site,
		unit,
		queries,
		orderData,
		referrerData,
		topEarnersData,
		visitorData,
		productData,
	};
}

function mapDispatchToProps( dispatch ) {
	return bindActionCreators(
		{
			saveDashboardUnit: value => savePreference( 'store-dashboardStatsWidgetUnit', value ),
		},
		dispatch
	);
}

export default connect( mapStateToProps, mapDispatchToProps )( localize( StatsWidget ) );
