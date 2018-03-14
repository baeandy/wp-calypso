/** @format */

/**
 * External dependencies
 */
import React from 'react';
import PropTypes from 'prop-types';
import { findIndex } from 'lodash';

/**
 * Internal dependencies
 */
import Delta from 'woocommerce/components/delta';
import formatCurrency from 'lib/format-currency';
import Sparkline from 'woocommerce/components/d3/sparkline';

const StatsWidgetStat = ( { label, site, attribute, type, data, date, delta } ) => {
	if ( ! data.length || ! site.ID ) {
		return null;
	}
	const index = findIndex( data, d => d.period === date );
	if ( ! data[ index ] ) {
		return null;
	}

	const value = data[ index ][ attribute ];
	const timeSeries = data.map( row => +row[ attribute ] );

	const renderDelta = () => {
		if ( ! delta || ( ! delta.classes && ! delta.direction ) ) {
			return null;
		}

		if ( delta.classes ) {
			return <Delta value={ delta.value } className={ delta.classes.join( ' ' ) } />;
		}

		const deltaValue =
			delta.direction === 'is-undefined-increase'
				? '-'
				: Math.abs( Math.round( delta.percentage_change * 100 ) );

		return (
			<Delta
				value={ `${ deltaValue }%` }
				className={ `${ delta.favorable } ${ delta.direction }` }
			/>
		);
	};

	const renderValue = () => {
		switch ( type ) {
			case 'currency':
				return formatCurrency( value, data[ index ].currency );
			case 'percent':
				return value + '%';
			case 'number':
			default:
				return Math.round( value * 100 ) / 100;
		}
	};

	return (
		<div className="stats-widget__box-contents">
			<p>{ label }</p>
			<span>{ renderValue() }</span>
			{ renderDelta() }
			<Sparkline aspectRatio={ 3 } data={ timeSeries } highlightIndex={ index } maxHeight={ 50 } />
		</div>
	);
};

StatsWidgetStat.propTypes = {
	site: PropTypes.shape( {
		id: PropTypes.number,
		slug: PropTypes.string,
	} ),
	label: PropTypes.string.isRequired,
	attribute: PropTypes.string.isRequired,
	type: PropTypes.string.isRequired,
	data: PropTypes.array.isRequired,
	date: PropTypes.string.isRequired,
	delta: PropTypes.object.isRequired,
};

export default StatsWidgetStat;
