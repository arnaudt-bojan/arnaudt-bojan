'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import {
  PersonAdd,
  Edit,
  Delete,
  Block,
  CheckCircle,
  Send,
  Close,
} from '@mui/icons-material';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'manager' | 'staff';
  status: 'active' | 'invited' | 'suspended';
  lastActive: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  invitedDate: string;
  status: 'pending';
}

interface Activity {
  id: string;
  action: string;
  member: string;
  timestamp: string;
}

const roleColors = {
  owner: 'error',
  admin: 'warning',
  manager: 'primary',
  staff: 'info',
} as const;

const statusColors = {
  active: 'success',
  invited: 'info',
  suspended: 'error',
} as const;

export default function TeamPage() {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [permissions, setPermissions] = useState({
    manageProducts: false,
    viewOrders: true,
    processOrders: false,
    manageCustomers: false,
    viewAnalytics: false,
    manageSettings: false,
    manageTeam: false,
  });

  const [teamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'owner',
      status: 'active',
      lastActive: '2025-10-20 14:30',
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'admin',
      status: 'active',
      lastActive: '2025-10-20 13:15',
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike@example.com',
      role: 'manager',
      status: 'active',
      lastActive: '2025-10-19 16:45',
    },
    {
      id: '4',
      name: 'Sarah Wilson',
      email: 'sarah@example.com',
      role: 'staff',
      status: 'invited',
      lastActive: 'Never',
    },
  ]);

  const [invitations] = useState<Invitation[]>([
    {
      id: '1',
      email: 'newteam@example.com',
      role: 'staff',
      invitedDate: '2025-10-19',
      status: 'pending',
    },
    {
      id: '2',
      email: 'manager2@example.com',
      role: 'manager',
      invitedDate: '2025-10-18',
      status: 'pending',
    },
  ]);

  const [recentActivity] = useState<Activity[]>([
    {
      id: '1',
      action: 'Invited new team member',
      member: 'John Doe',
      timestamp: '2025-10-20 14:00',
    },
    {
      id: '2',
      action: 'Updated role to Manager',
      member: 'Jane Smith',
      timestamp: '2025-10-20 12:30',
    },
    {
      id: '3',
      action: 'Removed team member',
      member: 'John Doe',
      timestamp: '2025-10-19 16:15',
    },
  ]);

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={roleColors[params.value as keyof typeof roleColors]}
          size="small"
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={statusColors[params.value as keyof typeof statusColors]}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'lastActive',
      headerName: 'Last Active',
      width: 180,
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          key="edit"
          icon={<Edit />}
          label="Edit"
          onClick={() => {
            setSelectedMember(params.row as TeamMember);
            setEditDialogOpen(true);
          }}
        />,
        <GridActionsCellItem
          key="suspend"
          icon={params.row.status === 'suspended' ? <CheckCircle /> : <Block />}
          label={params.row.status === 'suspended' ? 'Activate' : 'Suspend'}
          onClick={() => {}}
          disabled={params.row.role === 'owner'}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<Delete />}
          label="Delete"
          onClick={() => {}}
          disabled={params.row.role === 'owner'}
          showInMenu
        />,
      ],
    },
  ];

  const handleInvite = () => {
    console.log('Inviting:', inviteEmail, inviteRole, permissions);
    setInviteDialogOpen(false);
    setInviteEmail('');
    setInviteRole('staff');
    setPermissions({
      manageProducts: false,
      viewOrders: true,
      processOrders: false,
      manageCustomers: false,
      viewAnalytics: false,
      manageSettings: false,
      manageTeam: false,
    });
  };

  const handleUpdateRole = () => {
    setEditDialogOpen(false);
    setSelectedMember(null);
  };

  return (
    <DashboardLayout title="Team Management">
      <Container maxWidth="xl">
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              Team Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage team members and their permissions
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setInviteDialogOpen(true)}
            data-testid="button-invite-member"
          >
            Invite Team Member
          </Button>
        </Box>

        <Paper sx={{ mb: 3 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6">Team Members</Typography>
          </Box>
          <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={teamMembers}
              columns={columns}
              pageSizeOptions={[5, 10, 25]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
              disableRowSelectionOnClick
              data-testid="datagrid-team-members"
            />
          </Box>
        </Paper>

        <Paper sx={{ mb: 3, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Pending Invitations
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Invited Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>
                      <Chip label={invitation.role} size="small" />
                    </TableCell>
                    <TableCell>{invitation.invitedDate}</TableCell>
                    <TableCell>
                      <Chip label={invitation.status} color="info" size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="primary" title="Resend invitation">
                        <Send fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" title="Cancel invitation">
                        <Close fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recentActivity.map((activity) => (
              <Card key={activity.id} variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {activity.action}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        by {activity.member}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {activity.timestamp}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Paper>

        <Dialog
          open={inviteDialogOpen}
          onClose={() => setInviteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Invite Team Member
            <IconButton
              onClick={() => setInviteDialogOpen(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                data-testid="input-member-email"
              />
              
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={inviteRole}
                  label="Role"
                  onChange={(e) => setInviteRole(e.target.value)}
                  data-testid="select-member-role"
                >
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="staff">Staff</MenuItem>
                </Select>
              </FormControl>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Permissions
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={permissions.manageProducts}
                        onChange={(e) => setPermissions({ ...permissions, manageProducts: e.target.checked })}
                      />
                    }
                    label="Manage products"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={permissions.viewOrders}
                        onChange={(e) => setPermissions({ ...permissions, viewOrders: e.target.checked })}
                      />
                    }
                    label="View orders"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={permissions.processOrders}
                        onChange={(e) => setPermissions({ ...permissions, processOrders: e.target.checked })}
                      />
                    }
                    label="Process orders"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={permissions.manageCustomers}
                        onChange={(e) => setPermissions({ ...permissions, manageCustomers: e.target.checked })}
                      />
                    }
                    label="Manage customers"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={permissions.viewAnalytics}
                        onChange={(e) => setPermissions({ ...permissions, viewAnalytics: e.target.checked })}
                      />
                    }
                    label="View analytics"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={permissions.manageSettings}
                        onChange={(e) => setPermissions({ ...permissions, manageSettings: e.target.checked })}
                      />
                    }
                    label="Manage settings"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={permissions.manageTeam}
                        onChange={(e) => setPermissions({ ...permissions, manageTeam: e.target.checked })}
                      />
                    }
                    label="Manage team"
                  />
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleInvite}
              disabled={!inviteEmail}
              data-testid="button-send-invite"
            >
              Send Invitation
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Edit Team Member
            <IconButton
              onClick={() => setEditDialogOpen(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {selectedMember && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                <TextField
                  fullWidth
                  label="Name"
                  value={selectedMember.name}
                  disabled
                />
                
                <TextField
                  fullWidth
                  label="Email"
                  value={selectedMember.email}
                  disabled
                />

                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={selectedMember.role}
                    label="Role"
                    disabled={selectedMember.role === 'owner'}
                  >
                    <MenuItem value="owner">Owner</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="manager">Manager</MenuItem>
                    <MenuItem value="staff">Staff</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={selectedMember.status}
                    label="Status"
                    disabled={selectedMember.role === 'owner'}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="suspended">Suspended</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleUpdateRole}
              disabled={selectedMember?.role === 'owner'}
              data-testid="button-update-member"
            >
              Update
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </DashboardLayout>
  );
}
