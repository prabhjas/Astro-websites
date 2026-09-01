/**
 * Resolves the icon names used in `src/content/services/**` to Figma-exported
 * glyphs. Content files name an icon; only this module knows which file that is.
 *
 * The glyphs carry their terracotta fill from Figma, so they are rendered with
 * `Icon.astro`'s default `tone="original"` — see the icon notes in CLAUDE.md for
 * why the leaf is never sized to its frame.
 */
import type { SvgComponent } from "astro/types";

import type { ServiceIconName } from "./service-icon-names";

import scale from "../assets/icons/badge-scale.svg";
import institute from "../assets/icons/badge-institute.svg";
import money from "../assets/icons/badge-money.svg";
import law from "../assets/icons/badge-law.svg";
import protect from "../assets/icons/badge-protect.svg";
import global from "../assets/icons/badge-global.svg";
import employee from "../assets/icons/badge-employee.svg";
import employmentContracts from "../assets/icons/svc-employment-contracts.svg";
import payroll from "../assets/icons/svc-payroll.svg";
import socialSecurity from "../assets/icons/svc-social-security.svg";
import workPermits from "../assets/icons/svc-work-permits.svg";
import cbaCompliance from "../assets/icons/svc-cba-compliance.svg";
import expenses from "../assets/icons/svc-expenses.svg";
import severance from "../assets/icons/svc-severance.svg";
import hrAdmin from "../assets/icons/svc-hr-admin.svg";
import licence from "../assets/icons/badge-licence.svg";
import talk from "../assets/icons/badge-talk.svg";
import contractBriefcase from "../assets/icons/svc-contract-briefcase.svg";
import payEnvelope from "../assets/icons/svc-pay-envelope.svg";
import mealAllowance from "../assets/icons/svc-meal-allowance.svg";
import permitPassport from "../assets/icons/svc-permit-passport.svg";
import accidentInsurance from "../assets/icons/svc-accident-insurance.svg";
import probationSupport from "../assets/icons/svc-probation-support.svg";
import laptop from "../assets/icons/svc-laptop.svg";
import worldGlobe from "../assets/icons/svc-world-globe.svg";
import teamPeople from "../assets/icons/svc-team-people.svg";
import sickPay from "../assets/icons/svc-sick-pay.svg";
import worksCouncil from "../assets/icons/svc-works-council.svg";
import verified from "../assets/icons/svc-verified.svg";
import shieldTick from "../assets/icons/svc-shield-tick.svg";
import calculator from "../assets/icons/svc-calculator.svg";
import documentShield from "../assets/icons/svc-document-shield.svg";
import handStar from "../assets/icons/svc-hand-star.svg";
import beachParasol from "../assets/icons/svc-beach-parasol.svg";
import personArchive from "../assets/icons/svc-person-archive.svg";
import candidateSelection from "../assets/icons/svc-candidate-selection.svg";
import contractSigned from "../assets/icons/svc-contract-signed.svg";
import envelopeSeal from "../assets/icons/svc-envelope-seal.svg";
import riskShield from "../assets/icons/svc-risk-shield.svg";
import gavel from "../assets/icons/svc-gavel.svg";
import personCase from "../assets/icons/svc-person-case.svg";
import doorExit from "../assets/icons/svc-door-exit.svg";
import search from "../assets/icons/badge-search.svg";
import personScan from "../assets/icons/svc-person-scan.svg";
import documentStamp from "../assets/icons/svc-document-stamp.svg";
import documentLines from "../assets/icons/svc-document-lines.svg";
import searchPerson from "../assets/icons/svc-search-person.svg";
import headset from "../assets/icons/svc-headset.svg";
import swapArrows from "../assets/icons/svc-swap-arrows.svg";
import globePin from "../assets/icons/svc-globe-pin.svg";
import visa from "../assets/icons/badge-visa.svg";
import passportGlobe from "../assets/icons/svc-passport-globe.svg";
import envelopeDocument from "../assets/icons/svc-envelope-document.svg";
import documentCross from "../assets/icons/svc-document-cross.svg";
import moneyHand from "../assets/icons/svc-money-hand.svg";
import moneyRoll from "../assets/icons/svc-money-roll.svg";
import peopleGroup from "../assets/icons/svc-people-group.svg";

export const serviceIcons: Record<ServiceIconName, SvgComponent & ImageMetadata> = {
  scale,
  institute,
  money,
  law,
  protect,
  global,
  employee,
  "employment-contracts": employmentContracts,
  payroll,
  "social-security": socialSecurity,
  "work-permits": workPermits,
  "cba-compliance": cbaCompliance,
  expenses,
  severance,
  "hr-admin": hrAdmin,
  licence,
  talk,
  "contract-briefcase": contractBriefcase,
  "pay-envelope": payEnvelope,
  "meal-allowance": mealAllowance,
  "permit-passport": permitPassport,
  "accident-insurance": accidentInsurance,
  "probation-support": probationSupport,
  laptop,
  "world-globe": worldGlobe,
  "team-people": teamPeople,
  "sick-pay": sickPay,
  "works-council": worksCouncil,
  verified,
  "shield-tick": shieldTick,
  calculator,
  "document-shield": documentShield,
  "hand-star": handStar,
  "beach-parasol": beachParasol,
  "person-archive": personArchive,
  "envelope-document": envelopeDocument,
  "document-cross": documentCross,
  "money-hand": moneyHand,
  "candidate-selection": candidateSelection,
  "contract-signed": contractSigned,
  "envelope-seal": envelopeSeal,
  "risk-shield": riskShield,
  gavel,
  "person-case": personCase,
  "door-exit": doorExit,
  search,
  "person-scan": personScan,
  "document-stamp": documentStamp,
  "document-lines": documentLines,
  "search-person": searchPerson,
  headset,
  "swap-arrows": swapArrows,
  "globe-pin": globePin,
  visa,
  "passport-globe": passportGlobe,
  "money-roll": moneyRoll,
  "people-group": peopleGroup,
};
