// Top navigation header bar for guest users
import { MdArrowBack } from "react-icons/md";
import { useNavigate } from "react-router-dom";

const GuestHeader = () => {
  const navigate = useNavigate();

  return (
    <div className="guest-header">
      <button className="guest-back-btn" onClick={() => navigate("/")}>
        <MdArrowBack size={20} />
        <span>Back to HazSpot</span>
      </button>
    </div>
  );
};

export default GuestHeader;