import { useState } from "react";
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Typography } from "@mui/material";
import { Home, LocalShipping, Group, ShowChart, InsertDriveFile } from "@mui/icons-material";

const Sidebar = ({ onSelectTab }) => {
  const [open, setOpen] = useState(false);

  const handleMouseEnter = () => setOpen(true);
  const handleMouseLeave = () => setOpen(false);

  const liderItems = [
    { text: "Inicio", icon: <Home />, tab: 0 },
    { text: "Indicadores", icon: <ShowChart />, tab: 3 },
    { text: "Reporte Excel", icon: <InsertDriveFile />, tab: 4 },
  ];

  const otherItems = [
    { text: "Embarques", icon: <LocalShipping />, tab: 1 },
    { text: "Extracción Datos Vendedor", icon: <Group />, tab: 2 },
    { text: "Relación Lider - Vendedor", icon: <Group />, tab: 5 },
  ];

  return (
    <Drawer
      variant="permanent"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{
        width: open ? 240 : 60,
        transition: "width 0.3s ease-in-out",
        overflowX: "hidden",
        "& .MuiDrawer-paper": {
          width: open ? 240 : 60,
          transition: "width 0.3s ease-in-out",
          boxSizing: "border-box",
        },
      }}
    >
      <List>
        {/* Logo */}
        <ListItem key="logo" sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <img
            src="/images.png"
            alt="Logo"
            className="logo"
            style={{ width: open ? 100 : 40, height: open ? 100 : 40, transition: "width 0.3s, height 0.3s" }}
          />
        </ListItem>

        {/* Sección LIDER */}
        <ListItem sx={{ px: 2.5 }}>
          {open && <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>LIDER</Typography>}
        </ListItem>

        {liderItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ display: "block" }}>
            <ListItemButton
              onClick={() => onSelectTab(item.tab)}
              sx={{
                minHeight: 48,
                justifyContent: open ? "initial" : "center",
                px: 2.5,
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : "auto", justifyContent: "center" }}>
                {item.icon}
              </ListItemIcon>
              {open && <ListItemText primary={item.text} />}
            </ListItemButton>
          </ListItem>
        ))}

        {/* Divider para separar secciones */}
        <Divider sx={{ my: 1 }} />

        {/* Otros elementos */}
        <ListItem sx={{ px: 2.5 }}>
          {open && <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>CENTRO DE SERVICIO</Typography>}
        </ListItem>
        {otherItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ display: "block" }}>
            <ListItemButton
              onClick={() => onSelectTab(item.tab)}
              sx={{
                minHeight: 48,
                justifyContent: open ? "initial" : "center",
                px: 2.5,
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : "auto", justifyContent: "center" }}>
                {item.icon}
              </ListItemIcon>
              {open && <ListItemText primary={item.text} />}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;
