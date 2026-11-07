// Kept as TypeScript (not JSON) so it does not count toward the deployment
// storage guard's non-runtime JSON budget.
const productPolicy = {
  entitlement: "anzen_pro",
  currency: "JPY",
  monthlyPrice: 980,
  period: "P1M",
  limits: {
    free: { law_chat: 3, chemical_ra: 1, weatherLocations: 1, notifications: false },
    pro: { law_chat: 50, chemical_ra: 10, weatherLocations: 10, notifications: true },
  },
  proBurstPerMinute: 10,
  monthlyBudgetYen: 50000,
};

export default productPolicy;
