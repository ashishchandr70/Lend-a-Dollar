# Legal & Compliance Research Checklist (US)

This checklist exists to ensure Lend-a-Dollar’s design aligns with its ethical commitments and does not unintentionally recreate predatory or harmful financial dynamics.

This is not legal advice.  
Any real-world implementation requires qualified legal counsel.

---

## 1. Lending & Consumer Finance Law

### Federal
- [ ] Truth in Lending Act (TILA) – APR & fee disclosure  
- [ ] CFPB rules – unfair, deceptive, or abusive acts (UDAAP)  
- [ ] Fair lending considerations  

### State-Level
- [ ] Determine which states require consumer lending licenses  
- [ ] Identify interest rate caps and usury limits  
- [ ] Confirm micro-loan exemptions (if any)  
- [ ] Determine registration vs licensing requirements  
- [ ] Understand borrower protections per state  

Key Question:
> Is the platform legally considered a lender, loan broker, or facilitator?

---

## 2. Money Transmission & Custody of Funds

- [ ] FinCEN MSB registration requirements  
- [ ] State money transmitter licensing  
- [ ] Custodial obligations for user funds  
- [ ] Reserve / capital requirements  
- [ ] Consumer fund protection rules  
- [ ] Bankruptcy remoteness of user funds  

Key Question:
> Does holding or routing stablecoins for users trigger money transmission rules?

---

## 3. AML / KYC Compliance

- [ ] Bank Secrecy Act (BSA) applicability  
- [ ] AML program design  
- [ ] Suspicious Activity Report (SAR) obligations  
- [ ] Sanctions screening (OFAC)  
- [ ] Identity verification requirements  
- [ ] Ongoing transaction monitoring  
- [ ] Enhanced due diligence triggers  

Key Question:
> What level of monitoring is legally required vs ethically appropriate?

---

## 4. Stablecoins & Crypto-Specific Regulation

- [ ] Legal treatment of stablecoins  
- [ ] Custody classification  
- [ ] Consumer protection obligations  
- [ ] Smart contract liability  
- [ ] Disclosure obligations for yield-bearing products  

Key Question:
> Are yield-bearing stablecoins treated as financial products requiring special disclosures or licensing?

---

## 5. Securities Law (If Pooling Returns)

- [ ] SEC treatment of pooled lender funds  
- [ ] Investment contract risk (Howey test)  
- [ ] Disclosure obligations  
- [ ] Registration vs exemptions  

Key Question:
> Are lender interests considered securities?

---

## 6. Data Privacy & Security

- [ ] Gramm-Leach-Bliley Act (GLBA)  
- [ ] State privacy laws (CCPA/CPRA, etc.)  
- [ ] Data retention policies  
- [ ] Encryption & breach response  
- [ ] AI model governance  
- [ ] Consent for document processing  

Key Question:
> How is borrower financial data protected, and who can access it?

---

## 7. AI & Automated Decisioning Compliance

- [ ] Fair lending bias review  
- [ ] Explainability of decisions  
- [ ] Human override processes  
- [ ] Appeals mechanism for borrowers  
- [ ] Model auditing & drift detection  

Key Question:
> Can borrowers understand and challenge automated decisions?

---

## 8. Operational Risk & Consumer Harm Controls

- [ ] Loan caps per borrower  
- [ ] Exposure caps per lender  
- [ ] Cooling-off periods  
- [ ] Rate limiting repeat borrowing  
- [ ] Write-off policies  
- [ ] Kill-switch / pause mechanisms  

Key Question:
> What conditions require halting the platform to prevent harm?

---

## 9. Structural & Governance Review

- [ ] For-profit vs nonprofit vs hybrid structure  
- [ ] Platform fee transparency  
- [ ] Governance voting legality  
- [ ] Conflict-of-interest policies  
- [ ] Independent oversight  

Key Question:
> Does the platform structure support ethical commitments or undermine them?

---

## 10. Go / No-Go Criteria

The project should not proceed if:

- Regulatory risk is unmanageable  
- Consumer harm cannot be reasonably mitigated  
- Incentives drift toward extractive outcomes  
- Compliance cost outweighs social benefit  
- Legal clarity is insufficient for safe deployment  

---

## Final Note

Legal compliance is not just a regulatory obligation —  
it is part of the ethical design of Lend-a-Dollar.

Compliance exists to protect borrowers, lenders, and the platform itself.
