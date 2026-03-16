#!/usr/bin/env python3
"""migrate_legacy.py - Complete ETL: MySQL 5.7 dump -> PostgreSQL (Drizzle ORM)"""
import re, sys, uuid, traceback
from datetime import datetime, date as date_type
import psycopg2

DUMP = "/home/tangel/src/nest-investigation/nest-db-export.sql"
DB = dict(host="localhost", dbname="nesthome", user="lamppost", password="lamppost123")
PW = "$2b$12$placeholder_hash_for_changeme"

def read_dump(p):
    with open(p,"r",encoding="utf-8",errors="replace") as f: return f.read()

def extract_all_inserts(dump, tbl):
    """Find ALL INSERT blocks for a table and return concatenated VALUES content,
    handling semicolons inside quoted strings."""
    marker = "INSERT INTO `" + tbl + "` VALUES "
    results = []
    idx = 0
    while True:
        pos = dump.find(marker, idx)
        if pos < 0:
            break
        start = pos + len(marker)
        # Scan forward, tracking whether we're inside a string
        j = start
        in_str = False
        n = len(dump)
        while j < n:
            c = dump[j]
            if not in_str:
                if c == "'":
                    in_str = True
                elif c == ';':
                    break
            else:
                if c == '\\' and j + 1 < n:
                    j += 1  # skip escaped char
                elif c == "'":
                    in_str = False
            j += 1
        results.append(dump[start:j])
        idx = j + 1
    return ",".join(results) if results else ""

def parse_vals(block):
    rows=[]; i=0; n=len(block)
    if not block.strip(): return rows
    while i<n:
        while i<n and block[i]!='(': i+=1
        if i>=n: break
        i+=1; row=[]
        while i<n:
            while i<n and block[i] in ' \t\r\n': i+=1
            if i>=n: break
            if block[i]==')': i+=1; break
            elif block[i]==',': i+=1; continue
            elif block[i]=="'":
                i+=1; parts=[]
                while i<n:
                    if block[i]=='\\' and i+1<n:
                        c2=block[i+1]
                        parts.append({"'":"'",'"':'"','\\':'\\','n':'\n','r':'\r','t':'\t','0':'\0'}.get(c2,c2))
                        i+=2
                    elif block[i]=="'" and i+1<n and block[i+1]=="'": parts.append("'"); i+=2
                    elif block[i]=="'": i+=1; break
                    else: parts.append(block[i]); i+=1
                row.append("".join(parts))
            elif block[i:i+4].upper()=='NULL': row.append(None); i+=4
            else:
                j2=i
                while i<n and block[i] not in ',)': i+=1
                t=block[j2:i].strip()
                try: row.append(int(t))
                except ValueError:
                    try: row.append(float(t))
                    except ValueError: row.append(t)
        rows.append(row)
    return rows

def ptbl(dump, tbl):
    block = extract_all_inserts(dump, tbl)
    return parse_vals(block)

def parse_addr(raw):
    if not raw or not str(raw).strip(): return ("Unknown","Unknown","FL","00000")
    raw=str(raw).strip()
    m=re.match(r'^(.+?),\s*(.+?),\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$',raw)
    if m: return (m.group(1).strip(),m.group(2).strip(),m.group(3).upper(),m.group(4).strip())
    m=re.match(r'^(.+?),\s*(.+?),\s*([A-Za-z]{2})$',raw)
    if m: return (m.group(1).strip(),m.group(2).strip(),m.group(3).upper(),"00000")
    m=re.match(r'^(.+?),\s*(.+)$',raw)
    if m: return (m.group(1).strip(),m.group(2).strip(),"FL","00000")
    return (raw,"Unknown","FL","00000")

def bp(v):
    if v is None: return False
    if isinstance(v,bool): return v
    if isinstance(v,(int,float)): return bool(int(v))
    return False

def ss(v,ml=None):
    if v is None: return None
    s=str(v).strip()
    if not s: return None
    return s[:ml] if ml else s

def sph(v):
    if v is None: return None
    if isinstance(v,float): v=int(v)
    s=str(v).strip()
    if not s or s=='0': return None
    d=re.sub(r'\D','',s)
    if len(d)==10: return "({}) {}-{}".format(d[:3],d[3:6],d[6:])
    if len(d)==11 and d[0]=='1': return "({}) {}-{}".format(d[1:4],d[4:7],d[7:])
    return s

def nid(): return str(uuid.uuid4())
def pdt(v):
    if v is None: return None
    s=str(v).strip()
    return None if (not s or s.startswith('0000')) else s
def shtml(v):
    if v is None: return None
    return re.sub(r'<[^>]+>','',str(v)).strip() or None

def mvt(raw):
    if not raw: return "GENERAL"
    t=raw.upper().strip()
    for kw,vt in [('HVAC','HVAC'),('AC ','HVAC'),('AIR CON','HVAC'),('COOL','HVAC'),
                   ('PLUMB','PLUMBING'),('ELECTRIC','ELECTRICAL'),('PEST','PEST_CONTROL'),
                   ('LANDSCAP','LANDSCAPING'),('LAWN','LANDSCAPING'),('POOL','POOL'),
                   ('SWIM','POOL'),('SECURITY','SECURITY'),('ALARM','SECURITY')]:
        if kw in t: return vt
    return "GENERAL"

def safe_row(row, min_cols):
    """Pad row with None values if it has fewer columns than expected."""
    if len(row) < min_cols:
        row = row + [None] * (min_cols - len(row))
    return row

def main():
    print("="*60)
    print("NEST HOME - Legacy MySQL -> PostgreSQL Migration")
    print("="*60+"\n")
    print("Reading dump...")
    dump = read_dump(DUMP)
    print("  {:,} bytes\n".format(len(dump)))
    conn = psycopg2.connect(**DB); conn.autocommit = False; cur = conn.cursor()
    print("Connected to PostgreSQL\n")

    S={}; E={}
    rm={}; nm_map={}; cm={}; um={}; pm={}; cdat={}; wm={}; cwm={}

    # 0. TRUNCATE all target tables (reverse dependency order)
    try:
        print("[0] Truncating all target tables...")
        cur.execute("""
            TRUNCATE TABLE
                inspection_attachments, inspection_services, inspector_notes,
                inspection_hurricane, inspection_items, inspections,
                lodging,
                hurricane_checklist, property_custom_checklist,
                vendors,
                property_open_close_custom, property_open_close,
                property_hurricane, property_security,
                property_hvac, property_plumbing,
                properties, users, communities, neighborhoods, routes,
                checklist_template_items, checklist_templates, audit_log
            CASCADE
        """)
        conn.commit()
        print("  Truncated all tables")
        # Add google_drive_url column
        cur.execute("ALTER TABLE properties ADD COLUMN IF NOT EXISTS google_drive_url varchar(500)")
        conn.commit()
        print("  Added google_drive_url column\n")
    except Exception as e:
        conn.rollback()
        print("  Warning: {}".format(e))

    # 1. ROUTES
    try:
        print("[1/21] Routes -> routes")
        rows=ptbl(dump,"Routes")
        print("  Parsed {} rows".format(len(rows)))
        for r in rows: u=nid(); rm[r[0]]=u
        cur.executemany("INSERT INTO routes (id,name,notes) VALUES (%s,%s,%s)",
            [(rm[r[0]],ss(r[1]) or "Route{}".format(r[0]),ss(r[2])) for r in rows])
        conn.commit(); S["routes"]=len(rows); print("  -> {}".format(len(rows)))
    except Exception as e: conn.rollback(); E["routes"]=str(e); print("  ERR:",e); traceback.print_exc()

    # 2. NEIGHBORHOODS
    try:
        print("[2/21] Neighborhood -> neighborhoods")
        rows=ptbl(dump,"Neighborhood")
        print("  Parsed {} rows".format(len(rows)))
        for r in rows: u=nid(); nm_map[r[0]]=u
        cur.executemany("INSERT INTO neighborhoods (id,name) VALUES (%s,%s)",
            [(nm_map[r[0]],ss(r[1]) or "N{}".format(r[0])) for r in rows])
        conn.commit(); S["neighborhoods"]=len(rows); print("  -> {}".format(len(rows)))
    except Exception as e: conn.rollback(); E["neighborhoods"]=str(e); print("  ERR:",e); traceback.print_exc()

    # 3. COMMUNITIES
    try:
        print("[3/21] Community + N_to_C_map -> communities")
        crows=ptbl(dump,"Community")
        cdd={r[0]:{"n":ss(r[1]),"co":ss(r[2]),"mg":ss(r[3]),"ph":ss(r[4])} for r in crows}
        mrows=ptbl(dump,"Neighborhood_to_Communitiy_map")
        print("  Parsed {} community rows, {} map rows".format(len(crows),len(mrows)))
        seen=set(); ins=[]
        for r in mrows:
            r = safe_row(r, 6)
            mid,nfk,cfk,rfk,rpos=r[0],r[2],r[3],r[4],r[5]
            c=cdd.get(cfk,{}); n=c.get("n") or ss(r[1]) or "C{}".format(mid)
            if n in seen: n="{} ({})".format(n,mid)
            seen.add(n); u=nid(); cm[mid]=u
            ins.append((u,n[:255],ss(c.get("co"),255),ss(c.get("mg"),255),ss(c.get("ph"),20),nm_map.get(nfk),rm.get(rfk),rpos))
        cur.executemany("INSERT INTO communities (id,name,company_name,manager_name,phone_number,neighborhood_id,route_id,route_position) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",ins)
        conn.commit(); S["communities"]=len(ins); print("  -> {}".format(len(ins)))
    except Exception as e: conn.rollback(); E["communities"]=str(e); print("  ERR:",e); traceback.print_exc()

    # 4/5. USERS + PROPERTIES
    try:
        print("[4/21] Client -> users + properties")
        clrows=ptbl(dump,"Client"); print("  Parsed {} clients".format(len(clrows)))
        drows=ptbl(dump,"c_drive_info"); dd={r[0]:ss(r[2],500) if len(r)>2 else None for r in drows}
        uins=[]; pins=[]; seen_em=set()
        for r in clrows:
            r = safe_row(r, 24)
            cid=r[0]; fn=ss(r[1]) or "Unknown"; ln=ss(r[2]) or "Unknown"
            full="{} {}".format(fn,ln).strip()
            pa=ss(r[3]); gm=ss(r[4],500); wr=r[6]; ph=sph(r[8]) or sph(r[7])
            er=ss(r[11]); em=er.split(',')[0].strip().lower() if er else None
            if not em or em in seen_em: em="client_{}@placeholder.nest".format(cid)
            seen_em.add(em)
            ecn=ss(r[13]); ecp=sph(r[14]); ece=ss(r[15])
            an=None
            if ecn or ecp or ece:
                an="Emergency Contact: {} {} {}".format(ecn or '',ecp or '',ece or '').strip()
            cdat[cid]={"sfk":r[16],"cfk":r[17],"ocfk":r[18],"hfk":r[19],"dfk":r[22]}
            uu=nid(); um[cid]=uu
            uins.append((uu,em[:255],full[:255],PW,"CLIENT",ss(ph,20)))
            st,cy,sta,zp=parse_addr(pa); pu=nid(); pm[cid]=pu
            du=dd.get(r[22]) if r[22] else None
            pins.append((pu,st[:1000] if st else "Unknown",cy[:100] if cy else "Unknown",
                        sta[:2] if sta else "FL",zp[:10] if zp else "00000",
                        gm,uu,cm.get(r[17]),r[21],wr,bp(r[23]),an,du))
        cur.executemany("INSERT INTO users (id,email,name,password_hash,role,phone) VALUES (%s,%s,%s,%s,%s,%s)",uins)
        conn.commit(); S["users"]=len(uins); print("  -> {} users".format(len(uins)))
        cur.executemany("INSERT INTO properties (id,address,city,state,zip,google_map_link,client_id,community_id,route_position,weekly_rate,is_active,access_notes,google_drive_url) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",pins)
        conn.commit(); S["properties"]=len(pins); print("  -> {} properties".format(len(pins)))
    except Exception as e: conn.rollback(); E["users/properties"]=str(e); print("  ERR:",e); traceback.print_exc()

    # 6. PROPERTY_SECURITY (14 cols: Id + 13 fields)
    try:
        print("[6/21] c_security -> property_security")
        srows=ptbl(dump,"c_security"); sd={r[0]:r for r in srows if len(r)>=14}
        print("  Parsed {} rows ({} valid)".format(len(srows),len(sd)))
        ins=[]; seen=set()
        for cid,c2 in cdat.items():
            sfk=c2.get("sfk")
            if sfk is None or sfk not in sd: continue
            pu=pm.get(cid)
            if not pu or pu in seen: continue
            seen.add(pu); r=safe_row(sd[sfk],14)
            ins.append((nid(),pu,ss(r[1],255),ss(r[2],255),ss(r[3],255),ss(r[4],255),ss(r[5],255),ss(r[6],255),ss(r[7],255),ss(r[8],255),ss(r[9],255),ss(r[10]),ss(r[11],255),ss(r[12],500),ss(r[13],255)))
        cur.executemany("INSERT INTO property_security (id,property_id,key_number,key_bin_name,alarm_code,alarm_password,primary_alarm_panel_location,garage_door_keypad_code,front_door_keyless_entry_code,lock_box_code,lock_box_location,special_entry_instructions,community_gate_code,modem_location,wifi_password) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",ins)
        conn.commit(); S["property_security"]=len(ins); print("  -> {}".format(len(ins)))
    except Exception as e: conn.rollback(); E["property_security"]=str(e); print("  ERR:",e); traceback.print_exc()

    # 7. PROPERTY_HURRICANE
    try:
        print("[7/21] c_hurricanes -> property_hurricane")
        hrows=ptbl(dump,"c_hurricanes"); hd={r[0]:r for r in hrows if len(r)>=4}
        def mr(v,it):
            if v is None: return "NEST_HOME"
            return ("CLIENT_IN_TOWN" if it else "CLIENT_OUT_TOWN") if int(v)==1 else "NEST_HOME"
        ins=[]; seen=set()
        for cid,c2 in cdat.items():
            hfk=c2.get("hfk")
            if hfk is None or hfk not in hd: continue
            pu=pm.get(cid)
            if not pu or pu in seen: continue
            seen.add(pu); r=hd[hfk]
            ins.append((nid(),pu,mr(r[1],True),mr(r[2],False),shtml(ss(r[3]))))
        cur.executemany("INSERT INTO property_hurricane (id,property_id,responsibility_in_town,responsibility_out_town,notes) VALUES (%s,%s,%s,%s,%s)",ins)
        conn.commit(); S["property_hurricane"]=len(ins); print("  -> {}".format(len(ins)))
    except Exception as e: conn.rollback(); E["property_hurricane"]=str(e); print("  ERR:",e); traceback.print_exc()

    # 8. PROPERTY_OPEN_CLOSE (11 cols)
    try:
        print("[8/21] c_open_close_std -> property_open_close")
        ocr=ptbl(dump,"c_open_close_std"); ocd={r[0]:r for r in ocr if len(r)>=11}
        ins=[]; seen=set()
        for cid,c2 in cdat.items():
            ofk=c2.get("ocfk")
            if ofk is None or ofk not in ocd: continue
            pu=pm.get(cid)
            if not pu or pu in seen: continue
            seen.add(pu); r=ocd[ofk]
            ins.append((nid(),pu,bp(r[2]),bp(r[3]),bp(r[4]),bp(r[5]),bp(r[6]),bp(r[7]),bp(r[8]),bp(r[9]),bp(r[10])))
        cur.executemany("INSERT INTO property_open_close (id,property_id,open_water_valve,open_water_heater_breaker,open_ice_makers,open_insta_hot,close_water_valve,close_water_heater_breaker,close_ice_makers,close_empty_ice_makers,close_insta_hot) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",ins)
        conn.commit(); S["property_open_close"]=len(ins); print("  -> {}".format(len(ins)))
    except Exception as e: conn.rollback(); E["property_open_close"]=str(e); print("  ERR:",e); traceback.print_exc()

    # 9. PROPERTY_HVAC (13 cols: Id,HVAC_ID,airHandler,compressor,tstatAway,tstatHome,humidAwayd,humidHomed,filterLoc,filterDim,Client_fk,humidHome,humidAway)
    try:
        print("[9/21] c_hvac -> property_hvac")
        hvr=ptbl(dump,"c_hvac"); ins=[]
        for r in hvr:
            r=safe_row(r,13); cfk=r[10]; pu=pm.get(cfk)
            if not pu: continue
            ins.append((nid(),pu,ss(r[1],255),ss(r[2],255),ss(r[3],255),r[4],r[5],ss(r[12],255),ss(r[11],255),ss(r[8],255),ss(r[9],255)))
        cur.executemany("INSERT INTO property_hvac (id,property_id,hvac_id,air_handler_location,compressor_location,thermostat_setting_away,thermostat_setting_home,humidistat_setting_away,humidistat_setting_home,ac_filter_location,ac_filter_dimensions) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",ins)
        conn.commit(); S["property_hvac"]=len(ins); print("  -> {}".format(len(ins)))
    except Exception as e: conn.rollback(); E["property_hvac"]=str(e); print("  ERR:",e); traceback.print_exc()

    # 10. PROPERTY_PLUMBING (8 cols)
    try:
        print("[10/21] c_plumbing -> property_plumbing")
        plr=ptbl(dump,"c_plumbing"); ins=[]
        for r in plr:
            r=safe_row(r,8); cfk=r[7]; pu=pm.get(cfk)
            if not pu: continue
            ins.append((nid(),pu,ss(r[1],255),ss(r[2],255),ss(r[3],255),ss(r[4],255),ss(r[5],255),ss(r[6],255)))
        cur.executemany("INSERT INTO property_plumbing (id,property_id,system_id,main_shutoff_location,city_meter_location,water_heater_location,water_heater_shutoff_location,description) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",ins)
        conn.commit(); S["property_plumbing"]=len(ins); print("  -> {}".format(len(ins)))
    except Exception as e: conn.rollback(); E["property_plumbing"]=str(e); print("  ERR:",e); traceback.print_exc()

    # 11. PROPERTY_OPEN_CLOSE_CUSTOM (5 cols)
    try:
        print("[11/21] c_open_close_cus -> property_open_close_custom")
        ocr2=ptbl(dump,"c_open_close_cus"); ins=[]
        for r in ocr2:
            r=safe_row(r,5); cfk=r[4]; pu=pm.get(cfk)
            if not pu: continue
            ot="OPEN" if "OPEN" in str(r[1]).upper() else "CLOSE"
            ins.append((nid(),pu,ot,ss(r[2],255) or "Item",ss(r[3],255)))
        cur.executemany("INSERT INTO property_open_close_custom (id,property_id,type,item,value) VALUES (%s,%s,%s,%s,%s)",ins)
        conn.commit(); S["property_open_close_custom"]=len(ins); print("  -> {}".format(len(ins)))
    except Exception as e: conn.rollback(); E["property_open_close_custom"]=str(e); print("  ERR:",e); traceback.print_exc()

    # 12. HURRICANE_CHECKLIST (4 cols: Id, Item, Notes, Client_fk)
    try:
        print("[12/21] c_hurricane_checklist -> hurricane_checklist")
        hcr=ptbl(dump,"c_hurricane_checklist"); ins=[]; sc={}
        for r in hcr:
            r=safe_row(r,4); cfk=r[3]; pu=pm.get(cfk)
            if not pu: continue
            so=sc.get(pu,0); sc[pu]=so+1
            ins.append((nid(),pu,ss(r[1]) or "Item",ss(r[2]),so))
        cur.executemany("INSERT INTO hurricane_checklist (id,property_id,item,notes,sort_order) VALUES (%s,%s,%s,%s,%s)",ins)
        conn.commit(); S["hurricane_checklist"]=len(ins); print("  -> {}".format(len(ins)))
    except Exception as e: conn.rollback(); E["hurricane_checklist"]=str(e); print("  ERR:",e); traceback.print_exc()

    # 13. VENDORS (6 cols: Id, Type, Name, Phone, Notes, Client_fk)
    try:
        print("[13/21] c_vendors -> vendors")
        vr=ptbl(dump,"c_vendors"); ins=[]
        for r in vr:
            r=safe_row(r,6); cfk=r[5]; pu=pm.get(cfk)
            if not pu: continue
            ins.append((nid(),pu,mvt(ss(r[1])),ss(r[2],255) or "Unknown",ss(r[3],20),ss(r[4],500)))
        cur.executemany("INSERT INTO vendors (id,property_id,type,name,phone,notes) VALUES (%s,%s,%s,%s,%s,%s)",ins)
        conn.commit(); S["vendors"]=len(ins); print("  -> {}".format(len(ins)))
    except Exception as e: conn.rollback(); E["vendors"]=str(e); print("  ERR:",e); traceback.print_exc()

    # 14. PROPERTY_CUSTOM_CHECKLIST (4 cols: Id, Item, Notes, Client_fk)
    try:
        print("[14/21] c_custom_walksheet -> property_custom_checklist")
        cwr=ptbl(dump,"c_custom_walksheet"); ins=[]
        for r in cwr:
            r=safe_row(r,4); cfk=r[3]; pu=pm.get(cfk)
            if not pu: continue
            u=nid(); cwm[r[0]]=u
            ins.append((u,pu,ss(r[1],255) or "Item",ss(r[2],255)))
        cur.executemany("INSERT INTO property_custom_checklist (id,property_id,item,notes) VALUES (%s,%s,%s,%s)",ins)
        conn.commit(); S["property_custom_checklist"]=len(ins); print("  -> {}".format(len(ins)))
    except Exception as e: conn.rollback(); E["property_custom_checklist"]=str(e); print("  ERR:",e); traceback.print_exc()

    # 15. LODGING (12 cols: Id,Arrival,Departure,Notes,Client_fk,Event_ID,Event_URL,ArrivalWeekNum,DepartureWeekNum,NestNotes,departureUnknown)
    try:
        print("[15/21] Lodging -> lodging")
        lr=ptbl(dump,"Lodging"); ins=[]; today=date_type.today()
        print("  Parsed {} lodging rows".format(len(lr)))
        for r in lr:
            r=safe_row(r,12); cfk=r[4]; pu=pm.get(cfk)
            if not pu: continue
            uu=um.get(cfk); arr=pdt(r[1]); dep=pdt(r[2]); du_val=bp(r[11])
            cn=ss(r[3]); nn=ss(r[10])
            if du_val: status="IN_RESIDENCE"
            elif dep:
                try:
                    dd2=datetime.strptime(str(dep)[:10],"%Y-%m-%d").date()
                    status="DEPARTED" if dd2<today else "UPCOMING"
                except: status="UPCOMING"
            else: status="UPCOMING"
            ins.append((nid(),pu,uu,arr,dep,du_val,cn,nn,status))
        cur.executemany("INSERT INTO lodging (id,property_id,client_id,arrival,departure,departure_unknown,client_notes,nest_notes,status) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",ins)
        conn.commit(); S["lodging"]=len(ins); print("  -> {}".format(len(ins)))
    except Exception as e: conn.rollback(); E["lodging"]=str(e); print("  ERR:",e); traceback.print_exc()

    # 16. INSPECTIONS (Walksheets: 14 cols)
    try:
        print("[16/21] Walksheets -> inspections")
        iu=nid()
        cur.execute("INSERT INTO users (id,email,name,password_hash,role,phone) VALUES (%s,%s,%s,%s,%s,%s)",
            (iu,"inspector@nesthome.legacy","Legacy Inspector",PW,"INSPECTOR",None))
        au=nid()
        cur.execute("INSERT INTO users (id,email,name,password_hash,role,phone) VALUES (%s,%s,%s,%s,%s,%s)",
            (au,"admin@nesthome.legacy","Legacy Admin",PW,"ADMIN",None))
        conn.commit()
        wsr=ptbl(dump,"Walksheets"); print("  Parsed {} walksheets".format(len(wsr)))
        ilm={}; ldaps=set()
        for r in wsr:
            r2=safe_row(r,14); l=ss(r2[10])
            if l and l not in ldaps: ldaps.add(l)
        for l in ldaps:
            u=nid(); ilm[l]=u
            cur.execute("INSERT INTO users (id,email,name,password_hash,role,phone) VALUES (%s,%s,%s,%s,%s,%s)",
                (u,"inspector_{}@nesthome.legacy".format(l.lower().replace(' ','_')[:50]),l[:255],PW,"INSPECTOR",None))
        conn.commit()
        ins=[]; skip=0
        for r in wsr:
            r=safe_row(r,14)
            wid=r[0]; ts=pdt(r[1]); inum=r[2]
            if isinstance(inum,float): inum=int(inum)
            iok=bp(r[3]); eok=bp(r[4]); pa2=bp(r[5]); chd=bp(r[6])
            nce=ss(r[7]); cfk=r[8]; comp=bp(r[9]); insp=ss(r[10])
            wk=r[11]
            if isinstance(wk,float): wk=int(wk)
            hvac=ss(r[12]); hum=ss(r[13])
            pu=pm.get(cfk)
            if not pu: skip+=1; continue
            iuu=ilm.get(insp,iu)
            stat="COMPLETED" if comp else "SCHEDULED"
            sd2=None; ca=None
            if ts:
                try:
                    dt=datetime.fromisoformat(ts.replace(' ','T'))
                    sd2=dt.strftime('%Y-%m-%d')
                    if comp: ca=ts
                except: pass
            wu=nid(); wm[wid]=wu
            ins.append((wu,pu,iuu,None,inum,stat,sd2,ca,iok,eok,pa2,chd,hvac,hum,nce,None,wk))
        BATCH=5000
        for i in range(0,len(ins),BATCH):
            cur.executemany("INSERT INTO inspections (id,property_id,inspector_id,template_id,inspection_number,status,scheduled_date,completed_at,interior_ok,exterior_ok,prepared_home_arrival,closed_home_departure,hvac_temps,humidity_readings,notes_client_eyes,overall_notes,week_number) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",ins[i:i+BATCH])
        conn.commit(); S["inspections"]=len(ins); print("  -> {} (skipped {})".format(len(ins),skip))
    except Exception as e: conn.rollback(); E["inspections"]=str(e); print("  ERR:",e); traceback.print_exc()

    # 17. INSPECTOR_NOTES
    try:
        print("[17/21] w_inspectorNotes -> inspector_notes")
        inr=ptbl(dump,"w_inspectorNotes"); ins=[]; skip=0
        print("  Parsed {} rows".format(len(inr)))
        for r in inr:
            r=safe_row(r,3); wfk=r[2]; wu=wm.get(wfk)
            if not wu: skip+=1; continue
            notes=ss(r[1])
            if not notes: skip+=1; continue
            ins.append((nid(),wu,notes))
        BATCH=5000
        for i in range(0,len(ins),BATCH):
            cur.executemany("INSERT INTO inspector_notes (id,inspection_id,notes) VALUES (%s,%s,%s)",ins[i:i+BATCH])
        conn.commit(); S["inspector_notes"]=len(ins); print("  -> {} (skipped {})".format(len(ins),skip))
    except Exception as e: conn.rollback(); E["inspector_notes"]=str(e); print("  ERR:",e); traceback.print_exc()

    # 18. INSPECTION_SERVICES (w_additionalServices: Id,serviceCompleted,c_custom_walksheet_fk,Walksheets_fk,Item,Notes)
    try:
        print("[18/21] w_additionalServices -> inspection_services")
        asr=ptbl(dump,"w_additionalServices"); ins=[]; skip=0
        print("  Parsed {} rows".format(len(asr)))
        for r in asr:
            r=safe_row(r,6); wfk=r[3]; wu=wm.get(wfk)
            if not wu: skip+=1; continue
            ccu=cwm.get(r[2])
            ins.append((nid(),wu,ccu,ss(r[4]),ss(r[5]),bp(r[1])))
        BATCH=5000
        for i in range(0,len(ins),BATCH):
            cur.executemany("INSERT INTO inspection_services (id,inspection_id,custom_checklist_id,item,notes,service_completed) VALUES (%s,%s,%s,%s,%s,%s)",ins[i:i+BATCH])
        conn.commit(); S["inspection_services"]=len(ins); print("  -> {} (skipped {})".format(len(ins),skip))
    except Exception as e: conn.rollback(); E["inspection_services"]=str(e); print("  ERR:",e); traceback.print_exc()

    # 19. INSPECTION_ATTACHMENTS (w_attachments: Id,Description,DriveID,DriveURL,Walksheets_fk,UploadedName,timeStamp,Client_fk)
    try:
        print("[19/21] w_attachments -> inspection_attachments")
        atr=ptbl(dump,"w_attachments"); ins=[]; skip=0
        print("  Parsed {} rows".format(len(atr)))
        for r in atr:
            r=safe_row(r,8); wfk=r[4]; wu=wm.get(wfk)
            if not wu: skip+=1; continue
            desc=ss(r[1],255); url=ss(r[3]) or ""; fname=ss(r[5],255); ts=pdt(r[6])
            if not url and not desc: skip+=1; continue
            ins.append((nid(),wu,desc,url or "unknown",fname,ts))
        cur.executemany("INSERT INTO inspection_attachments (id,inspection_id,description,file_url,file_name,uploaded_at) VALUES (%s,%s,%s,%s,%s,%s)",ins)
        conn.commit(); S["inspection_attachments"]=len(ins); print("  -> {} (skipped {})".format(len(ins),skip))
    except Exception as e: conn.rollback(); E["inspection_attachments"]=str(e); print("  ERR:",e); traceback.print_exc()

    # SUMMARY
    conn.close()
    print("\n" + "="*60)
    print("MIGRATION COMPLETE")
    print("="*60)
    print("\nRows migrated per table:")
    total=0
    for t in ["routes","neighborhoods","communities","users","properties",
              "property_security","property_hurricane","property_open_close",
              "property_hvac","property_plumbing","property_open_close_custom",
              "hurricane_checklist","vendors","property_custom_checklist",
              "lodging","inspections","inspector_notes","inspection_services",
              "inspection_attachments"]:
        c=S.get(t,0); total+=c
        status="OK" if t not in E else "FAILED: "+E[t][:80]
        print("  {:35s} {:>8,}  {}".format(t,c,status))
    print("  {:35s} {:>8,}".format("TOTAL",total))
    if E:
        print("\nERRORS ({}):\n".format(len(E)))
        for t,e in E.items(): print("  {}: {}".format(t,e[:200]))
        sys.exit(1)
    else:
        print("\nAll tables migrated successfully!")

if __name__=="__main__":
    main()
