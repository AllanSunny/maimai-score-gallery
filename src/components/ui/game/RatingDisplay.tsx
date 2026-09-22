import basePlate from "../../../assets/ratings/base.png";
import bluePlate from "../../../assets/ratings/blue.png";
import bronzePlate from "../../../assets/ratings/bronze.png";
import goldPlate from "../../../assets/ratings/gold.png";
import greenPlate from "../../../assets/ratings/green.png";
import kiwamiPlate from "../../../assets/ratings/kiwami.png";
import orangePlate from "../../../assets/ratings/orange.png";
import platinumPlate from "../../../assets/ratings/platinum.png";
import purplePlate from "../../../assets/ratings/purple.png";
import rainbowPlate from "../../../assets/ratings/rainbow.png";
import redPlate from "../../../assets/ratings/red.png";
import silverPlate from "../../../assets/ratings/silver.png";
import { classNames } from "../../../utils/class-names";
import { ratingPlateFor, type RatingPlate } from "../../../utils/rating";

interface RatingDisplayProps {
  rating: number;
  className?: string;
}

const plates: Record<RatingPlate, string> = {
  base: basePlate,
  blue: bluePlate,
  green: greenPlate,
  orange: orangePlate,
  red: redPlate,
  purple: purplePlate,
  bronze: bronzePlate,
  silver: silverPlate,
  gold: goldPlate,
  platinum: platinumPlate,
  rainbow: rainbowPlate,
  kiwami: kiwamiPlate,
};

export function RatingDisplay({ rating, className }: RatingDisplayProps) {
  if (rating > 99_999) {
    throw new RangeError("RatingDisplay supports ratings up to five digits.");
  }

  const plate = ratingPlateFor(rating);
  const digits = rating.toString().padStart(5, " ");

  return (
    <div
      className={classNames("rating-display", className)}
      role="img"
      aria-label={`DX rating ${rating}`}
    >
      <img className="rating-display__plate" src={plates[plate]} alt="" />
      <div className="rating-display__digits" aria-hidden="true">
        {[...digits].map((digit, index) => (
          <div className="rating-display__digit" key={index}>
            {digit === " " ? "\u00a0" : digit}
          </div>
        ))}
      </div>
    </div>
  );
}
