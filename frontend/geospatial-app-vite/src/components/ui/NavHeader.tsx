import React from "react";
import "./NavHeader.css";

const NavHeader: React.FC = () => {
  return (
    <header className="nav-header">
      <div className="nav-header-logo">
        <img
          src="/hazspot-logo(2).png"
          alt="HazSpot logo"
          className="nav-header-logo-img"
        />
      </div>
    </header>
  );
};

export default NavHeader;