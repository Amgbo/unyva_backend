# Throne System Implementation TODO

## Overview
Implement a weekly throne calculation system that awards students for various achievements on the platform.

## Throne Types to Implement

### 1. Top Seller Throne
- **Description**: Most completed deals this week (orders + deliveries + meetups)
- **Data Sources**:
  - `orders` table (status = 'delivered')
  - `deliveries` table (status = 'completed')
  - Meetup completions (need to identify how meetups are tracked)
- **Score**: Total completed transactions
- **Minimum**: At least 1 completed transaction

### 2. Most Trusted Seller Throne
- **Description**: Highest rated seller with minimum 3 reviews
- **Data Sources**:
  - `product_reviews` table
  - `service_reviews` table
- **Score**: Average rating across all products/services
- **Minimum**: 3+ reviews total

### 3. Most Followed Student Throne
- **Description**: Most new followers gained this week
- **Data Sources**:
  - `follows` table (created_at within week)
- **Score**: Number of new followers
- **Minimum**: At least 1 new follower

### 4. Most Active Student Throne
- **Description**: Most engagement and activity across the platform
- **Data Sources**:
  - `product_views` (views on their products)
  - `service_bookings` (service bookings received)
  - `orders` (as buyer)
  - `product_reviews` + `service_reviews` (reviews written)
- **Score**: Weighted composite score
- **Weights**: Views (0.3), Bookings (0.3), Orders (0.2), Reviews (0.2)

## Implementation Steps

### Phase 1: Database Schema Updates
- [ ] Update throne tables to match actual schema (throne_type_id, student_id, points_earned)
- [ ] Create throne_types lookup table with predefined types
- [ ] Add proper indexes for performance

### Phase 2: Throne Calculation Logic
- [ ] Implement `calculateWeeklyThrones()` function in ThroneModel
- [ ] Create individual calculation functions for each throne type:
  - [ ] `calculateTopSellerThrone(weekStart)`
  - [ ] `calculateMostTrustedSellerThrone(weekStart)`
  - [ ] `calculateMostFollowedStudentThrone(weekStart)`
  - [ ] `calculateMostActiveStudentThrone(weekStart)`
- [ ] Handle edge cases (no data, minimum thresholds, ties)

### Phase 3: Data Retrieval Functions
- [ ] Fix `getCurrentThroneHolders()` to work with new schema
- [ ] Update `getThroneHoldersForWeek()` method
- [ ] Update `getUserThroneHistory()` method
- [ ] Ensure all methods return proper ThroneWinner interface

### Phase 4: Testing & Validation
- [ ] Test throne calculation with sample data
- [ ] Verify API endpoints return correct data
- [ ] Test edge cases (no thrones, single winner, ties)
- [ ] Performance testing with larger datasets

### Phase 5: Frontend Integration
- [ ] Update throneService to handle new data structure
- [ ] Test throne display in frontend
- [ ] Handle loading states and error cases

## Technical Considerations
- **Time Zone Handling**: Ensure week calculations are consistent
- **Performance**: Use efficient SQL queries, consider materialized views for complex calculations
- **Data Integrity**: Handle concurrent calculations, prevent duplicates
- **Caching**: Consider caching throne results to reduce database load
- **Scalability**: Design for growing user base and transaction volume

## Success Criteria
- [ ] All throne types calculated accurately
- [ ] API endpoints return data without errors
- [ ] Frontend displays thrones correctly
- [ ] System handles edge cases gracefully
- [ ] Performance meets requirements
